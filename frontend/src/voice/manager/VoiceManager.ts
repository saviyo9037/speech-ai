import { 
  STTEngine, 
  TTSEngine, 
  AIEngine, 
  VoiceStatus, 
  VoiceConfig, 
  ConversationMessage, 
  TerminalLog, 
  PluginContext, 
  VoicePlugin,
  AIResponse
} from '../types';
import { BrowserSTT } from '../stt/BrowserSTT';
import { BrowserTTS } from '../tts/BrowserTTS';
import { SpeechEngineFactory } from '../factory/SpeechEngineFactory';
import { BackendAI } from '../ai/BackendAI';
import { LocalAI } from '../ai/LocalAI';
import { ConversationMemory } from '../memory/ConversationMemory';
import { SessionManager } from '../memory/SessionManager';
import { IntentParser } from '../parser/IntentParser';
import { ActionQueue } from '../queue/ActionQueue';
import { SpeechQueue } from '../queue/SpeechQueue';
import { PluginManager } from '../plugins/PluginManager';
import { 
  getBuiltInPlugins, 
  getCustomPlugins, 
  CustomPluginDef, 
  saveCustomPlugin, 
  deleteCustomPlugin 
} from '../plugins/PluginRegistry';

export class VoiceManager {
  // Engines
  public stt: STTEngine;
  public tts: TTSEngine;
  public backendAI: AIEngine;
  public localAI: AIEngine;

  // Managers
  public sessionManager: SessionManager;
  public memory: ConversationMemory;
  public pluginManager: PluginManager;
  
  // Queues
  public actionQueue: ActionQueue;
  public speechQueue: SpeechQueue;

  // State Callbacks for React integration
  private onStateChange: ((state: {
    status: VoiceStatus;
    messages: ConversationMessage[];
    logs: TerminalLog[];
    interimTranscript: string;
    isActive: boolean;
    config: VoiceConfig;
    notes: Array<{ id: string; content: string; createdAt: string }>;
    timer: { duration: number; remaining: number } | null;
  }) => void) | null = null;

  // Current local states
  private status: VoiceStatus = 'idle';
  private interimTranscript: string = '';
  private config: VoiceConfig;
  private notes: Array<{ id: string; content: string; createdAt: string }> = [];
  
  // Timer State
  private timerInterval: any | null = null;
  private timerState: { duration: number; remaining: number } | null = null;

  constructor(stt?: STTEngine, tts?: TTSEngine) {
    // Load config from localStorage or use defaults
    const savedConfig = localStorage.getItem('nova_voice_config');
    this.config = savedConfig ? JSON.parse(savedConfig) : {
      wakeWordEnabled: true,
      wakeWord: 'Hey Nova',
      language: 'en-US',
      ttsVoice: '',
      ttsRate: 1.0,
      ttsPitch: 1.0,
      ttsVolume: 1.0,
      backendUrl: 'http://localhost:5000',
      apiKey: '',
      model: 'gpt-4o-mini'
    };

    // Load saved notes
    const savedNotes = localStorage.getItem('nova_notes');
    this.notes = savedNotes ? JSON.parse(savedNotes) : [];

    // Initialize engines — accept injected engines or create via factory
    this.stt = stt ?? SpeechEngineFactory.createSTT();
    this.tts = tts ?? SpeechEngineFactory.createTTS();
    this.backendAI = new BackendAI();
    this.localAI = new LocalAI();

    // Initialize memory, session, queues
    this.memory = new ConversationMemory();
    this.sessionManager = new SessionManager(12000); // 12 seconds auto-lock
    this.actionQueue = new ActionQueue();
    this.speechQueue = new SpeechQueue(this.tts);

    // Build plugin execution context
    const context: PluginContext = {
      terminalLog: (source, msg) => this.log(source, msg),
      addNote: (content) => this.addNote(content),
      getNotes: () => this.notes,
      deleteNote: (id) => this.deleteNote(id),
      setTimer: (secs) => this.startTimer(secs),
      getWeather: async (loc) => {
        // Handled directly inside WeatherPlugin
        return { location: loc };
      }
    };

    this.pluginManager = new PluginManager(context);

    // Register plugins (Builtin + Saved Custom ones)
    getBuiltInPlugins().forEach(p => this.pluginManager.register(p));
    getCustomPlugins().forEach(p => this.pluginManager.register(p));

    this.setupListeners();
    this.log('SYSTEM', 'Nova Voice Operating System initialized.');
  }

  public subscribe(callback: (state: any) => void) {
    this.onStateChange = callback;
    this.notify();
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange({
        status: this.status,
        messages: this.memory.getMessages(),
        logs: this.memory.getLogs(),
        interimTranscript: this.interimTranscript,
        isActive: this.sessionManager.isActive(),
        config: this.config,
        notes: this.notes,
        timer: this.timerState
      });
    }
  }

  private log(source: TerminalLog['source'], message: string) {
    this.memory.addLog(source, message);
    this.notify();
  }

  private setupListeners() {
    // STT Handlers
    this.stt.onResult((data) => {
      if (data.isFinal) {
        this.interimTranscript = '';
        this.notify();
        this.handleSpeechInput(data.transcript);
      } else {
        this.interimTranscript = data.transcript;
        this.notify();
        
        // If active, reset silence timeout on partial speech
        if (this.sessionManager.isActive()) {
          this.sessionManager.resetTimeout();
        }
      }
    });

    this.stt.onError((err) => {
      this.log('ERROR', `Speech recognition error: ${err}`);
      this.status = 'idle';
      this.notify();
    });

    this.stt.onStatusChange((sttStatus) => {
      if (sttStatus === 'listening' && this.status === 'idle') {
        this.status = 'listening';
      } else if (sttStatus === 'idle' && this.status === 'listening') {
        this.status = 'idle';
      }
      this.notify();
    });

    // Session Manager Handlers
    this.sessionManager.onDeactivate(() => {
      this.log('SYSTEM', 'Voice session went idle.');
      this.status = 'idle';
      this.notify();
    });

    // Action Queue Handlers
    this.actionQueue.subscribe({
      onTaskStart: (task) => {
        this.status = 'executing';
        this.notify();
      },
      onTaskComplete: () => {
        this.status = 'idle';
        this.notify();
      }
    });

    // Speech Queue Handlers
    this.speechQueue.subscribe({
      onSpeechStart: (text) => {
        this.status = 'speaking';
        this.notify();
      },
      onSpeechEnd: () => {
        this.status = 'idle';
        this.notify();
      }
    });

    // Apply speech preferences
    this.applyTTSConfig();
  }

  private applyTTSConfig() {
    this.tts.setRate(this.config.ttsRate);
    this.tts.setPitch(this.config.ttsPitch);
    this.tts.setVolume(this.config.ttsVolume);
    if (this.config.ttsVoice) {
      this.tts.setVoice(this.config.ttsVoice);
    }
  }

  // Play a simple futuristic chime beep using the Web Audio API
  private playActivationBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      // Futuristic upward beep
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('[VoiceManager] Web Audio API context denied.');
    }
  }

  private playDeactivationBeep() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      // Futuristic downward beep
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.12);
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      // ignore
    }
  }

  public startListening() {
    this.speechQueue.clear();
    this.stt.start();
    this.log('STT', 'Speech recognition engine started.');
    
    // If wake word is disabled, manually override and activate session directly
    if (!this.config.wakeWordEnabled) {
      this.sessionManager.activate();
      this.playActivationBeep();
    }
  }

  public stopListening() {
    this.stt.stop();
    this.sessionManager.deactivate();
    this.playDeactivationBeep();
    this.log('STT', 'Speech recognition engine stopped.');
  }

  /**
   * Main speech pipeline orchestrator
   */
  private async handleSpeechInput(text: string) {
    if (!text || text.trim() === '') return;

    this.log('STT', `Recognized: "${text}"`);

    // 1. Wake word filtering
    if (this.config.wakeWordEnabled && !this.sessionManager.isActive()) {
      const { detected, strippedText } = this.sessionManager.checkWakeWord(text, this.config.wakeWord);
      
      if (detected) {
        this.log('SYSTEM', `Wake word "${this.config.wakeWord}" detected! Entering command mode.`);
        this.playActivationBeep();
        
        // If there was something spoken *after* the wake word, process it immediately
        if (strippedText && strippedText.trim().length > 0) {
          await this.processPrompt(strippedText);
        }
      } else {
        this.log('SYSTEM', `Ignored speech: "${text}" (Awaiting wake word)`);
      }
    } else {
      // Session is active or wake word is off
      this.sessionManager.resetTimeout();
      await this.processPrompt(text);
    }
  }

  /**
   * Text override interface (Keyboard / CLI execution)
   */
  public async triggerTextCommand(text: string) {
    this.sessionManager.activate();
    this.playActivationBeep();
    await this.processPrompt(text);
  }

  /**
   * Process prompt with AI and execute resulting intents
   */
  private async processPrompt(prompt: string) {
    this.status = 'thinking';
    this.notify();
    
    this.log('AI', `Processing request: "${prompt}"`);
    const userMessage = this.memory.addMessage('user', prompt);
    this.notify();

    let aiResult: AIResponse;

    try {
      // 1. Attempt Backend AI processing
      aiResult = await this.backendAI.process(prompt, this.memory.getMessages(), this.config);
    } catch (err) {
      // 2. Failover to local browser NLP
      this.log('SYSTEM', 'Backend offline or failed. Falling back to Local AI rules engine.');
      aiResult = await this.localAI.process(prompt, this.memory.getMessages(), this.config);
    }

    const parsed = IntentParser.parse(aiResult);
    userMessage.intent = parsed.intent;
    
    this.log('AI', `Parsed Intent: "${parsed.intent}". Voice response: "${parsed.response}"`);

    // Handle immediate cancellation intent before speech
    if (parsed.intent === 'stop_speaking') {
      this.speechQueue.clear();
      this.status = 'idle';
      this.notify();
      return;
    }

    // 3. Queue up the Action for plugin execution
    if (parsed.intent && parsed.intent !== 'conversation' && parsed.intent !== 'unknown') {
      this.actionQueue.enqueue(parsed.intent, async () => {
        const executionResult = await this.pluginManager.executeIntent(parsed.intent, parsed.parameters);
        
        userMessage.actionExecuted = parsed.intent;
        userMessage.pluginUsed = this.pluginManager.findPluginForIntent(parsed.intent)?.name || 'Unknown';
        userMessage.success = executionResult.success;
        
        // If the execution returned custom spoken feedback, speak it, otherwise speak LLM default
        const feedbackText = executionResult.success ? executionResult.message : `Plugin failure: ${executionResult.message}`;
        this.speechQueue.enqueue(feedbackText);
        
        this.notify();
        return executionResult;
      });
    } else {
      // Pure conversation reply
      this.speechQueue.enqueue(parsed.response);
    }

    this.notify();
  }

  // --- Configuration ---
  public updateConfig(newConfig: Partial<VoiceConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('nova_voice_config', JSON.stringify(this.config));
    this.applyTTSConfig();
    this.stt.setLanguage(this.config.language);
    this.log('SYSTEM', 'Voice config settings updated.');
    this.notify();
  }

  // --- Memory Clearers ---
  public clearHistory() {
    this.memory.clear();
    this.log('SYSTEM', 'Conversation logs cleared.');
    this.notify();
  }

  // --- Note Management ---
  private addNote(content: string) {
    const note = {
      id: Math.random().toString(36).substring(2, 9),
      content,
      createdAt: new Date().toLocaleString()
    };
    this.notes.unshift(note);
    localStorage.setItem('nova_notes', JSON.stringify(this.notes));
    this.log('PLUGIN', `Note saved: "${content}"`);
    this.notify();
    return note;
  }

  public deleteNote(idOrIndex: any): boolean {
    const originalLen = this.notes.length;
    
    // Try by index first (e.g. "Note 1" where user speaks index)
    const idx = parseInt(idOrIndex, 10);
    if (!isNaN(idx) && idx > 0 && idx <= this.notes.length) {
      const removed = this.notes.splice(idx - 1, 1);
      localStorage.setItem('nova_notes', JSON.stringify(this.notes));
      this.log('PLUGIN', `Deleted note ${idx}: "${removed[0].content}"`);
      this.notify();
      return true;
    }

    // Try by string ID match
    this.notes = this.notes.filter(n => n.id !== idOrIndex);
    if (this.notes.length < originalLen) {
      localStorage.setItem('nova_notes', JSON.stringify(this.notes));
      this.log('PLUGIN', `Deleted note ID: ${idOrIndex}`);
      this.notify();
      return true;
    }

    return false;
  }

  // --- Timer Engine ---
  private startTimer(seconds: number) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.timerState = { duration: seconds, remaining: seconds };
    this.notify();

    this.timerInterval = setInterval(() => {
      if (this.timerState) {
        const nextSec = this.timerState.remaining - 1;
        if (nextSec <= 0) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          this.timerState = null;
          
          this.log('SYSTEM', 'Timer completed!');
          this.speechQueue.enqueue('Attention. Your countdown timer has finished.');
          
          // Sound alarm
          this.playAlarmBeeps();
        } else {
          this.timerState = { ...this.timerState, remaining: nextSec };
        }
        this.notify();
      }
    }, 1000);
  }

  private playAlarmBeeps() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      let time = ctx.currentTime;
      // Pulse 3 high-pitch warning double beeps
      for (let i = 0; i < 3; i++) {
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.frequency.setValueAtTime(880, time);
        gain1.gain.setValueAtTime(0.1, time);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc1.start(time);
        osc1.stop(time + 0.15);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(880, time + 0.2);
        gain2.gain.setValueAtTime(0.1, time + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
        osc2.start(time + 0.2);
        osc2.stop(time + 0.35);

        time += 0.6;
      }
    } catch (e) {
      // ignore
    }
  }

  // --- Dynamic Custom Plugin SDK Creators ---
  public registerCustomPlugin(def: CustomPluginDef) {
    saveCustomPlugin(def);
    
    // Re-instantiate custom plugin & register it in manager
    const getCustoms = getCustomPlugins();
    const target = customsToRegister(def.id, getCustoms);
    
    if (target) {
      this.pluginManager.register(target);
      this.log('SYSTEM', `Compiled and loaded custom plugin: ${def.name}`);
      this.notify();
    }
  }

  public removeCustomPlugin(id: string) {
    deleteCustomPlugin(id);
    this.pluginManager.unregister(id);
    this.notify();
  }

  public destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.stt.destroy();
    this.tts.destroy();
    this.speechQueue.clear();
    this.actionQueue.clear();
  }
}

// Helper to extract instantiated custom plugin
function customsToRegister(id: string, list: VoicePlugin[]): VoicePlugin | undefined {
  return list.find(p => p.id === id);
}
