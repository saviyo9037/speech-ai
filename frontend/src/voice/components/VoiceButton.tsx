import React from 'react';
import { useVoice } from '../hooks/useVoice';
import { Mic, MicOff, Loader, Volume2 } from 'lucide-react';

export const VoiceButton: React.FC = () => {
  const { status, isActive, startListening, stopListening } = useVoice();

  const handleToggle = () => {
    if (status === 'listening' || isActive) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Determine styles based on state
  let buttonColor = 'bg-slate-900 border-white/10 hover:border-cyber-cyan/40 text-slate-400';
  let glowColor = 'shadow-[0_0_15px_rgba(255,255,255,0.05)]';
  let ringAnim = '';
  
  if (status === 'listening') {
    buttonColor = 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan/20';
    glowColor = 'shadow-[0_0_30px_rgba(6,182,212,0.6)] animate-pulse-glow';
    ringAnim = 'animate-ping duration-1000 border-cyber-cyan';
  } else if (status === 'thinking') {
    buttonColor = 'bg-cyber-purple/15 border-cyber-purple text-cyber-purple';
    glowColor = 'shadow-[0_0_30px_rgba(168,85,247,0.6)]';
  } else if (status === 'speaking') {
    buttonColor = 'bg-cyber-magenta/15 border-cyber-magenta text-cyber-magenta';
    glowColor = 'shadow-[0_0_30px_rgba(236,72,153,0.6)]';
  } else if (isActive) {
    // Session is awake but waiting
    buttonColor = 'bg-cyber-cyan/10 border-cyber-cyan/40 text-cyber-cyan';
    glowColor = 'shadow-[0_0_15px_rgba(6,182,212,0.35)]';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      <div className="relative flex items-center justify-center">
        {/* Outer glowing ripple ring */}
        {status === 'listening' && (
          <div className="absolute inset-0 rounded-full border-2 border-cyber-cyan opacity-40 animate-ping" />
        )}
        {status === 'speaking' && (
          <div className="absolute -inset-4 rounded-full border border-cyber-magenta/30 animate-pulse" />
        )}
        
        {/* Rotating ring when thinking */}
        {status === 'thinking' && (
          <div className="absolute -inset-2 rounded-full border-2 border-dashed border-cyber-purple animate-spin-slow" />
        )}

        {/* Central button */}
        <button
          onClick={handleToggle}
          className={`relative z-10 w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${buttonColor} ${glowColor} focus:outline-none`}
        >
          {status === 'listening' && <Mic className="w-10 h-10 animate-bounce" />}
          {status === 'thinking' && <Loader className="w-10 h-10 animate-spin" />}
          {status === 'speaking' && <Volume2 className="w-10 h-10" />}
          {status === 'idle' && !isActive && <MicOff className="w-10 h-10" />}
          {status === 'idle' && isActive && <Mic className="w-10 h-10" />}
        </button>
      </div>

      {/* Spoken State subtitle */}
      <span className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
        {status === 'listening' && <span className="text-cyber-cyan animate-pulse">Listening...</span>}
        {status === 'thinking' && <span className="text-cyber-purple animate-pulse">Thinking...</span>}
        {status === 'speaking' && <span className="text-cyber-magenta animate-pulse">Speaking...</span>}
        {status === 'executing' && <span className="text-cyber-yellow animate-pulse">Executing...</span>}
        {status === 'idle' && (
          isActive ? (
            <span className="text-cyber-cyan/70">Session Active</span>
          ) : (
            <span className="text-slate-500">System Ready</span>
          )
        )}
      </span>
    </div>
  );
};
