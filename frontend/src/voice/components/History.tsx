import React, { useEffect, useRef } from 'react';
import { useVoice } from '../hooks/useVoice';
import { Terminal, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';

export const History: React.FC = () => {
  const { messages, clearHistory } = useVoice();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 select-none bg-slate-900/30">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-xs uppercase font-mono tracking-widest font-semibold text-slate-300">
            Conversation History
          </h3>
        </div>
        <button 
          onClick={clearHistory}
          className="text-[10px] font-mono uppercase bg-slate-800 hover:bg-red-500/20 border border-white/10 hover:border-red-500/35 text-slate-400 hover:text-red-400 px-2.5 py-1 rounded transition-all"
        >
          Clear
        </button>
      </div>

      {/* Bubble List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 p-8 py-20 select-none">
            <Terminal className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-mono uppercase tracking-wider">Memory Log Empty</p>
            <p className="text-xs mt-1 text-slate-500">Spoken interactions will log here.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                {/* Bubble */}
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    isUser 
                      ? 'bg-slate-800/80 border border-white/10 text-slate-100 rounded-tr-none'
                      : 'bg-gradient-to-br from-slate-900 to-slate-950 border border-cyber-purple/20 text-slate-200 rounded-tl-none shadow-[0_4px_12px_rgba(0,0,0,0.3)]'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Metadata tag pills */}
                {!isUser && msg.intent && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 px-2 select-none">
                    <span className="text-[9px] font-mono bg-cyber-purple/10 text-cyber-purple px-1.5 py-0.5 rounded border border-cyber-purple/20">
                      Intent: {msg.intent}
                    </span>
                    {msg.pluginUsed && (
                      <span className="text-[9px] font-mono bg-cyber-cyan/10 text-cyber-cyan px-1.5 py-0.5 rounded border border-cyber-cyan/20">
                        Plugin: {msg.pluginUsed}
                      </span>
                    )}
                    {msg.actionExecuted && (
                      <span className={`text-[9px] font-mono flex items-center space-x-1 px-1.5 py-0.5 rounded border ${
                        msg.success 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {msg.success ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                        <span>{msg.success ? 'Executed' : 'Failed'}</span>
                      </span>
                    )}
                  </div>
                )}
                <span className="text-[9px] font-mono text-slate-500 mt-1 px-2 select-none">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
