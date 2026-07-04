import React, { createContext, useEffect, useState, useRef } from 'react';
import { VoiceManager } from '../manager/VoiceManager';
import { 
  VoiceStatus, 
  ConversationMessage, 
  TerminalLog, 
  VoiceConfig 
} from '../types';
import { CustomPluginDef } from '../plugins/PluginRegistry';

export interface VoiceContextType {
  status: VoiceStatus;
  messages: ConversationMessage[];
  logs: TerminalLog[];
  interimTranscript: string;
  isActive: boolean;
  config: VoiceConfig;
  notes: Array<{ id: string; content: string; createdAt: string }>;
  timer: { duration: number; remaining: number } | null;
  startListening: () => void;
  stopListening: () => void;
  triggerTextCommand: (text: string) => Promise<void>;
  updateConfig: (config: Partial<VoiceConfig>) => void;
  clearHistory: () => void;
  registerCustomPlugin: (def: CustomPluginDef) => void;
  removeCustomPlugin: (id: string) => void;
  voiceManager: VoiceManager | null;
}

export const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const managerRef = useRef<VoiceManager | null>(null);
  
  // Mirroring voice manager states in React state for trigger rendering
  const [state, setState] = useState<{
    status: VoiceStatus;
    messages: ConversationMessage[];
    logs: TerminalLog[];
    interimTranscript: string;
    isActive: boolean;
    config: VoiceConfig;
    notes: Array<{ id: string; content: string; createdAt: string }>;
    timer: { duration: number; remaining: number } | null;
  }>({
    status: 'idle',
    messages: [],
    logs: [],
    interimTranscript: '',
    isActive: false,
    config: {
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
    },
    notes: [],
    timer: null
  });

  useEffect(() => {
    // Instantiate the Voice Manager orchestrator
    const manager = new VoiceManager();
    managerRef.current = manager;

    // Subscribe React listener to state updates
    manager.subscribe((updatedState) => {
      setState({
        status: updatedState.status,
        messages: updatedState.messages,
        logs: updatedState.logs,
        interimTranscript: updatedState.interimTranscript,
        isActive: updatedState.isActive,
        config: updatedState.config,
        notes: updatedState.notes,
        timer: updatedState.timer
      });
    });

    return () => {
      manager.destroy();
    };
  }, []);

  const value: VoiceContextType = {
    ...state,
    startListening: () => managerRef.current?.startListening(),
    stopListening: () => managerRef.current?.stopListening(),
    triggerTextCommand: (text) => {
      if (managerRef.current) {
        return managerRef.current.triggerTextCommand(text);
      }
      return Promise.resolve();
    },
    updateConfig: (cfg) => managerRef.current?.updateConfig(cfg),
    clearHistory: () => managerRef.current?.clearHistory(),
    registerCustomPlugin: (def) => managerRef.current?.registerCustomPlugin(def),
    removeCustomPlugin: (id) => managerRef.current?.removeCustomPlugin(id),
    voiceManager: managerRef.current
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
};
