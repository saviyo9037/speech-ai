import React, { useState, useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useVoice';
import { Terminal as TermIcon, Play } from 'lucide-react';

export const Terminal: React.FC = () => {
  const { logs, triggerTextCommand } = useVoice();
  const [cmd, setCmd] = useState('');
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd.trim()) return;
    
    // Trigger text override command
    triggerTextCommand(cmd.trim());
    setCmd('');
  };

  const getSourceStyle = (source: string) => {
    switch (source) {
      case 'STT': return 'text-cyber-cyan';
      case 'AI': return 'text-cyber-purple';
      case 'EXECUTOR': return 'text-cyber-magenta';
      case 'PLUGIN': return 'text-cyber-green';
      case 'TTS': return 'text-pink-400';
      case 'SYSTEM': return 'text-slate-400';
      case 'ERROR': return 'text-red-500 font-bold';
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="flex flex-col h-64 bg-slate-950/85 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden font-mono text-xs">
      {/* Header */}
      <div className="flex items-center px-4 py-2 border-b border-white/5 select-none bg-slate-900/40 text-slate-400">
        <TermIcon className="w-3.5 h-3.5 mr-2 text-cyber-cyan" />
        <span className="uppercase tracking-wider font-bold">Nova Developer Console Terminal</span>
      </div>

      {/* Logs output console */}
      <div className="flex-1 p-4 overflow-y-auto space-y-1 scrollbar-thin">
        {logs.length === 0 ? (
          <span className="text-slate-600 italic">
            Console idle. Say a command or speak the wake word to start logging events.
          </span>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="leading-5">
              <span className="text-slate-500 select-none mr-2">[{log.timestamp}]</span>
              <span className={`mr-2 font-bold ${getSourceStyle(log.source)}`}>
                [{log.source}]
              </span>
              <span className="text-slate-300">{log.message}</span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>

      {/* manual command interface */}
      <form 
        onSubmit={handleSubmit} 
        className="border-t border-white/5 p-2 bg-slate-900/40 flex items-center"
      >
        <span className="text-cyber-cyan font-bold mr-2 select-none">&gt;</span>
        <input 
          type="text" 
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          placeholder="Type command manually (e.g., 'open settings', 'calculate 15 * 8' or 'add note buy milk')..."
          className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-600 focus:ring-0 focus:outline-none h-6 text-xs font-mono"
        />
        <button 
          type="submit"
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyber-cyan rounded transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
