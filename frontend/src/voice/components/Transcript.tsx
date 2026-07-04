import React from 'react';
import { useVoice } from '../hooks/useVoice';

export const Transcript: React.FC = () => {
  const { interimTranscript, messages, status, config } = useVoice();

  // Find the last user message to show as previous transcript
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');

  return (
    <div className="w-full bg-slate-900/40 border border-white/5 rounded-xl p-4 backdrop-blur-md">
      <div className="flex justify-between items-center mb-2 select-none">
        <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
          Live Recognition stream
        </h4>
        {status === 'listening' && (
          <span className="text-[9px] uppercase font-mono bg-cyber-cyan/15 text-cyber-cyan px-2 py-0.5 rounded animate-pulse">
            Stream Active
          </span>
        )}
      </div>
      
      <div className="min-h-[50px] flex items-center text-sm md:text-base text-slate-200">
        {interimTranscript ? (
          <p className="text-cyber-cyan font-medium italic animate-pulse">
            "{interimTranscript}..."
          </p>
        ) : status === 'listening' ? (
          <p className="text-slate-500 italic">
            Listening... (Say "{config.wakeWord}" first if wake word is active)
          </p>
        ) : lastUserMessage ? (
          <p className="text-slate-300 font-medium">
            "{lastUserMessage.content}"
          </p>
        ) : (
          <p className="text-slate-600 italic">
            System idle. Click the microphone or say "{config.wakeWord}" to start speaking.
          </p>
        )}
      </div>
    </div>
  );
};
