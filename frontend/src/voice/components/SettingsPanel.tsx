import React, { useEffect, useState } from 'react';
import { useVoice } from '../hooks/useVoice';
import { Settings, Volume2, ShieldCheck, Wifi, Sparkles, HelpCircle } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const { config, updateConfig, voiceManager } = useVoice();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [testText, setTestText] = useState('Welcome to the Nova audio engine.');
  const [backendStatus, setBackendStatus] = useState<{
    connected: boolean;
    engine: string;
    loading: boolean;
  }>({
    connected: false,
    engine: 'checking...',
    loading: true
  });

  useEffect(() => {
    const fetchVoices = async () => {
      if (voiceManager) {
        const list = await voiceManager.tts.getVoices();
        setVoices(list);
      }
    };
    fetchVoices();
  }, [voiceManager]);

  useEffect(() => {
    // Check backend status
    const checkBackend = async () => {
      try {
        const url = `${config.backendUrl}/api/status`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setBackendStatus({
            connected: true,
            engine: data.engine,
            loading: false
          });
        } else {
          throw new Error();
        }
      } catch (e) {
        setBackendStatus({
          connected: false,
          engine: 'Local Fallback Engine',
          loading: false
        });
      }
    };
    checkBackend();
    
    // Check periodically (every 10s)
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, [config.backendUrl]);

  const handleTestTTS = () => {
    if (voiceManager && testText.trim()) {
      voiceManager.speechQueue.enqueue(testText.trim());
    }
  };

  const handleSliderChange = (key: 'ttsRate' | 'ttsPitch' | 'ttsVolume', val: number) => {
    updateConfig({ [key]: val });
  };

  const handleToggleWakeWord = () => {
    updateConfig({ wakeWordEnabled: !config.wakeWordEnabled });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-white/5 bg-slate-900/30">
        <Settings className="w-4 h-4 text-cyber-cyan mr-2" />
        <h3 className="text-xs uppercase font-mono tracking-widest font-semibold text-slate-300">
          System settings
        </h3>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[380px] md:max-h-none">
        {/* System connectivity health */}
        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-3 flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2">
            <Wifi className={`w-3.5 h-3.5 ${backendStatus.connected ? 'text-cyber-green' : 'text-cyber-yellow'}`} />
            <span className="text-slate-400 font-mono">Backend:</span>
            <span className="text-slate-200 font-medium">
              {backendStatus.loading ? 'Verifying...' : backendStatus.connected ? 'Connected' : 'Offline (Local)'}
            </span>
          </div>
          <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded font-mono text-slate-500">
            {backendStatus.engine}
          </span>
        </div>

        {/* Wake Word config */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide">Wake Word Activation</span>
            <button
              onClick={handleToggleWakeWord}
              className={`text-[9px] font-mono uppercase px-2.5 py-1 rounded border transition-all ${
                config.wakeWordEnabled 
                  ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan' 
                  : 'bg-slate-800 border-white/10 text-slate-500'
              }`}
            >
              {config.wakeWordEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {config.wakeWordEnabled && (
            <div>
              <label className="block text-[10px] font-mono text-slate-500 mb-1">Wake Word String</label>
              <input 
                type="text"
                value={config.wakeWord}
                onChange={(e) => updateConfig({ wakeWord: e.target.value })}
                className="w-full bg-slate-900/60 border border-white/5 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
              />
            </div>
          )}
        </div>

        <hr className="border-white/5" />

        {/* TTS parameters */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
            <Volume2 className="w-3.5 h-3.5 text-cyber-magenta" />
            <span>Voice Synthesis Parameters</span>
          </h4>

          {/* Voice Dropdown */}
          <div>
            <label className="block text-[10px] font-mono text-slate-500 mb-1">Voice Profile</label>
            <select
              value={config.ttsVoice}
              onChange={(e) => updateConfig({ ttsVoice: e.target.value })}
              className="w-full bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="">Default OS Voice</option>
              {voices.map(v => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Rate Slider */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Speed Rate</span>
              <span>{config.ttsRate}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={config.ttsRate}
              onChange={(e) => handleSliderChange('ttsRate', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyber-magenta"
            />
          </div>

          {/* Pitch Slider */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Pitch</span>
              <span>{config.ttsPitch}</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={config.ttsPitch}
              onChange={(e) => handleSliderChange('ttsPitch', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyber-magenta"
            />
          </div>

          {/* Volume Slider */}
          <div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Volume</span>
              <span>{Math.round(config.ttsVolume * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.0" 
              max="1.0" 
              step="0.1" 
              value={config.ttsVolume}
              onChange={(e) => handleSliderChange('ttsVolume', parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyber-magenta"
            />
          </div>

          {/* Test TTS */}
          <div className="flex items-center space-x-2 pt-1.5">
            <input 
              type="text" 
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              className="flex-1 bg-slate-900 border border-white/5 rounded px-2.5 py-1 text-xs text-slate-200"
            />
            <button
              onClick={handleTestTTS}
              className="text-[10px] font-mono uppercase bg-slate-800 border border-white/10 text-slate-300 hover:text-cyber-magenta px-3 py-1 rounded"
            >
              Test
            </button>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Backend config */}
        <div className="space-y-3">
          <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyber-purple" />
            <span>Developer Credentials</span>
          </h4>

          <div>
            <label className="block text-[10px] font-mono text-slate-500 mb-1">Server Endpoint URL</label>
            <input 
              type="text"
              value={config.backendUrl}
              onChange={(e) => updateConfig({ backendUrl: e.target.value })}
              className="w-full bg-slate-900 border border-white/5 rounded px-2.5 py-1 text-xs font-mono text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-500 mb-1">OpenAI API Key (Stored locally)</label>
            <input 
              type="password"
              value={config.apiKey}
              onChange={(e) => updateConfig({ apiKey: e.target.value })}
              placeholder="••••••••••••••••••••"
              className="w-full bg-slate-900 border border-white/5 rounded px-2.5 py-1 text-xs font-mono text-slate-300"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-slate-500 mb-1">LLM Model Name</label>
            <input 
              type="text"
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              className="w-full bg-slate-900 border border-white/5 rounded px-2.5 py-1 text-xs font-mono text-slate-300"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
