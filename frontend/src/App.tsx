import React, { useState } from 'react';
import { VoiceProvider } from './voice/context/VoiceContext';
import { useVoice } from './voice/hooks/useVoice';
import { VoiceButton } from './voice/components/VoiceButton';
import { VoiceVisualizer } from './voice/components/VoiceVisualizer';
import { Transcript } from './voice/components/Transcript';
import { History } from './voice/components/History';
import { Terminal } from './voice/components/Terminal';
import { PluginPanel } from './voice/components/PluginPanel';
import { SettingsPanel } from './voice/components/SettingsPanel';
import { Cpu, Settings as SettingsIcon, StickyNote, Activity, BellRing } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { timer, notes, status, voiceManager } = useVoice();
  const [activeTab, setActiveTab] = useState<'plugins' | 'settings' | 'notes'>('plugins');

  return (
    <div className="min-h-screen flex flex-col max-w-7xl mx-auto px-4 py-6 md:py-8 font-sans antialiased text-slate-200">
      
      {/* Platform Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-white/5 select-none space-y-4 md:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyber-cyan to-cyber-purple flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <span className="font-bold text-slate-950 text-xl font-mono">N</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center">
              NOVA <span className="text-[10px] uppercase font-mono bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/35 px-1.5 py-0.5 ml-2.5 rounded">Voice OS v1.0</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">STANDALONE SPEECH ORCHESTRATOR & INTENT ENGINE</p>
          </div>
        </div>

        {/* System Health / Status Banner */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs bg-slate-900/40 border border-white/5 px-3 py-1.5 rounded-lg font-mono">
            <Activity className={`w-3.5 h-3.5 ${status !== 'idle' ? 'text-cyber-cyan animate-pulse' : 'text-slate-500'}`} />
            <span className="text-slate-500">Status:</span>
            <span className={`font-semibold uppercase ${
              status === 'listening' ? 'text-cyber-cyan' :
              status === 'thinking' ? 'text-cyber-purple' :
              status === 'speaking' ? 'text-cyber-magenta' :
              status === 'executing' ? 'text-cyber-yellow' : 'text-slate-400'
            }`}>
              {status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-stretch">
        
        {/* Left Column: Settings, Plugins, & Local Notes widgets */}
        <div className="lg:col-span-4 flex flex-col space-y-4 min-h-[400px]">
          {/* Tab Selection */}
          <div className="flex bg-slate-950/65 border border-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('plugins')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'plugins'
                  ? 'bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Plugins</span>
            </button>
            
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'notes'
                  ? 'bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notes ({notes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-mono uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-cyber-magenta/10 text-cyber-magenta border border-cyber-magenta/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Config</span>
            </button>
          </div>

          {/* Render Tab Contents */}
          <div className="flex-1 min-h-0">
            {activeTab === 'plugins' && <PluginPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
            {activeTab === 'notes' && (
              <div className="flex flex-col h-full bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden select-none">
                <div className="px-4 py-3 border-b border-white/5 bg-slate-900/30">
                  <h3 className="text-xs uppercase font-mono tracking-widest font-semibold text-slate-300">
                    Notepad Vault
                  </h3>
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[380px] md:max-h-none">
                  {notes.length === 0 ? (
                    <div className="text-center text-slate-600 p-8 py-20 font-mono text-xs">
                      No saved notes found. Say "Add a note to check schedules".
                    </div>
                  ) : (
                    notes.map((note: any, index: number) => (
                      <div key={note.id} className="bg-slate-900/35 border border-white/5 p-3 rounded-lg flex justify-between items-start space-x-2">
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-cyber-purple font-semibold">Note {notes.length - index}</span>
                          <p className="text-xs text-slate-300 leading-relaxed font-medium">{note.content}</p>
                          <span className="text-[8px] font-mono text-slate-600 block">{note.createdAt}</span>
                        </div>
                        <button
                          onClick={() => voiceManager?.deleteNote(note.id)}
                          className="text-[9px] font-mono text-slate-500 hover:text-red-400 bg-slate-950 border border-white/5 hover:border-red-500/20 px-2 py-0.5 rounded transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Core Voice Interaction */}
        <div className="lg:col-span-4 flex flex-col space-y-4 justify-between min-h-[400px]">
          {/* Glowing Voice Trigger */}
          <div className="bg-slate-950/45 border border-white/5 rounded-xl p-4 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Visual background lines */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03)_0%,transparent_70%)] pointer-events-none" />
            
            <VoiceButton />
          </div>

          {/* Active Countdown timer card */}
          {timer && (
            <div className="bg-slate-950/60 border border-cyber-magenta/30 rounded-xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(236,72,153,0.15)] animate-pulse">
              <div className="flex items-center space-x-3">
                <BellRing className="w-5 h-5 text-cyber-magenta animate-bounce" />
                <div>
                  <h4 className="text-[10px] uppercase font-mono tracking-wider text-cyber-magenta font-semibold">
                    Countdown Timer Active
                  </h4>
                  <span className="text-[9px] text-slate-500 font-mono">Original: {timer.duration} seconds</span>
                </div>
              </div>
              <span className="text-3xl font-mono font-bold text-slate-100 bg-slate-900/60 border border-white/5 px-4 py-1 rounded-lg">
                {timer.remaining}s
              </span>
            </div>
          )}

          {/* Real-time Waveform */}
          <VoiceVisualizer />

          {/* Live transcript screen */}
          <Transcript />
        </div>

        {/* Right Column: Chat timeline bubble history */}
        <div className="lg:col-span-4 min-h-[300px]">
          <History />
        </div>

        {/* Bottom Panel: developer terminal log console */}
        <div className="lg:col-span-12 mt-2">
          <Terminal />
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-6 text-center select-none text-[10px] font-mono text-slate-600">
        NOVA VOICE OPERATING SYSTEM PLATFORM • REACT 19 + VITE + TAILWIND CSS
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <VoiceProvider>
      <DashboardContent />
    </VoiceProvider>
  );
};
export default App;
