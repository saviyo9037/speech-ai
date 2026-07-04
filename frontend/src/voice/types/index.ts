export interface STTCallbackData {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

export interface STTEngine {
  start(): void;
  stop(): void;
  isListening(): boolean;
  onResult(callback: (data: STTCallbackData) => void): void;
  onError(callback: (error: string) => void): void;
  onStatusChange(callback: (status: 'idle' | 'listening' | 'processing') => void): void;
  setLanguage(lang: string): void;
  destroy(): void;
}

export interface TTSEngine {
  speak(text: string): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getVoices(): Promise<SpeechSynthesisVoice[]>;
  setVoice(voiceName: string): void;
  setRate(rate: number): void;
  setPitch(pitch: number): void;
  setVolume(volume: number): void;
  destroy(): void;
}

export interface AIResponse {
  intent: string;
  parameters: Record<string, any>;
  response: string;
}

export interface AIEngine {
  process(prompt: string, history: ConversationMessage[], config: VoiceConfig): Promise<AIResponse>;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: string;
  actionExecuted?: string;
  pluginUsed?: string;
  success?: boolean;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  source: 'STT' | 'AI' | 'EXECUTOR' | 'PLUGIN' | 'TTS' | 'SYSTEM' | 'ERROR';
  message: string;
}

export interface VoiceConfig {
  wakeWordEnabled: boolean;
  wakeWord: string; // 'Hey Nova' | 'Hey Assistant' | 'Hey Voice'
  language: string;
  ttsVoice: string;
  ttsRate: number;
  ttsPitch: number;
  ttsVolume: number;
  backendUrl: string;
  apiKey: string;
  model: string;
}

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'executing' | 'speaking';

export interface PluginContext {
  terminalLog: (source: 'STT' | 'AI' | 'EXECUTOR' | 'PLUGIN' | 'TTS' | 'SYSTEM' | 'ERROR', message: string) => void;
  addNote: (content: string) => any;
  getNotes: () => any[];
  deleteNote: (id: string | number) => boolean;
  setTimer: (seconds: number) => void;
  getWeather: (location: string) => Promise<any>;
}

export interface PluginExecutionResult {
  success: boolean;
  data?: any;
  message: string;
}

export interface VoicePlugin {
  id: string;
  name: string;
  description: string;
  intents: string[];
  execute(intent: string, parameters: Record<string, any>, context: PluginContext): Promise<PluginExecutionResult>;
}
