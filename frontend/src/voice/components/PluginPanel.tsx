import React, { useState } from 'react';
import { useVoice } from '../hooks/useVoice';
import { Cpu, Plus, Code, Trash, AlertTriangle } from 'lucide-react';
import { CustomPluginDef } from '../plugins/PluginRegistry';

const INITIAL_BOILERPLATE = `// Custom Plugin SDK Code Editor
// Arguments available: intent (string), parameters (Record<string, any>), context (PluginContext)
// Return structure: { success: boolean, message: string, data?: any }

context.terminalLog('PLUGIN', 'Custom plugin triggered with intent: ' + intent);

const name = parameters.name || 'Stranger';
const message = 'Greetings ' + name + '! This message was computed inside a custom compiled Javascript sandboxed plugin.';

return {
  success: true,
  message: message,
  data: { name }
};`;

export const PluginPanel: React.FC = () => {
  const { voiceManager, registerCustomPlugin, removeCustomPlugin } = useVoice();
  const [showEditor, setShowEditor] = useState(false);

  // Editor states
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [intentsText, setIntentsText] = useState('');
  const [code, setCode] = useState(INITIAL_BOILERPLATE);
  const [compileError, setCompileError] = useState('');

  const activePlugins = voiceManager?.pluginManager.getPlugins() || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCompileError('');

    if (!id.trim() || !name.trim() || !intentsText.trim()) {
      setCompileError('ID, Name, and at least one Intent are required.');
      return;
    }

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const intents = intentsText.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);

    // Validate JS code syntax
    try {
      // Test compilation using new Function constructor
      new Function('intent', 'parameters', 'context', code);
    } catch (err: any) {
      setCompileError(`JS Compilation Error: ${err.message}`);
      return;
    }

    const newPluginDef: CustomPluginDef = {
      id: cleanId,
      name: name.trim(),
      description: description.trim() || 'Custom user plugin',
      intents,
      code
    };

    registerCustomPlugin(newPluginDef);
    
    // Reset editor
    setId('');
    setName('');
    setDescription('');
    setIntentsText('');
    setCode(INITIAL_BOILERPLATE);
    setShowEditor(false);
  };

  const handleDelete = (pluginId: string) => {
    removeCustomPlugin(pluginId);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/40 border border-white/5 rounded-xl backdrop-blur-md overflow-hidden select-none">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-slate-900/30">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-cyber-cyan" />
          <h3 className="text-xs uppercase font-mono tracking-widest font-semibold text-slate-300">
            Plugin Registry
          </h3>
        </div>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="text-[10px] font-mono uppercase bg-cyber-cyan/10 hover:bg-cyber-cyan/25 border border-cyber-cyan/30 text-cyber-cyan px-2.5 py-1 rounded flex items-center space-x-1 transition-all"
        >
          {showEditor ? <span>Close</span> : <><Plus className="w-3 h-3" /> <span>Create Plugin</span></>}
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto max-h-[380px] md:max-h-none">
        {showEditor ? (
          // Editor Section
          <form onSubmit={handleSave} className="space-y-4">
            <h4 className="text-xs uppercase font-mono text-slate-400 flex items-center space-x-1.5">
              <Code className="w-3.5 h-3.5 text-cyber-purple" />
              <span>Compile Dynamic SDK Plugin</span>
            </h4>

            {compileError && (
              <div className="flex items-start space-x-2 text-red-400 bg-red-950/20 border border-red-500/30 p-2.5 rounded text-xs">
                <AlertTriangle className="w-4 h-4 mr-1 shrink-0" />
                <span className="font-mono">{compileError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Plugin ID (lowercase, alphanumeric)</label>
                <input 
                  type="text" 
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="e.g., custom_greet"
                  className="w-full bg-slate-900/80 border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-purple focus:ring-0"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Plugin Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Custom Greeting"
                  className="w-full bg-slate-900/80 border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-purple focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Description</label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief explanation of what this plugin performs..."
                className="w-full bg-slate-900/80 border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-purple focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">
                Supported Intents (Comma separated list)
              </label>
              <input 
                type="text" 
                value={intentsText}
                onChange={(e) => setIntentsText(e.target.value)}
                placeholder="e.g., greet_user, custom_hello"
                className="w-full bg-slate-900/80 border border-white/10 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyber-purple focus:ring-0"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-500 uppercase mb-1">Javascript Function Body</label>
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={8}
                className="w-full bg-slate-950 border border-white/10 rounded p-2.5 text-[11px] text-emerald-400 font-mono focus:outline-none focus:border-cyber-cyan focus:ring-0 h-44"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                type="button" 
                onClick={() => setShowEditor(false)}
                className="text-[10px] font-mono uppercase bg-slate-800 border border-white/10 text-slate-400 px-3 py-1.5 rounded"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="text-[10px] font-mono uppercase bg-cyber-purple/20 hover:bg-cyber-purple/35 border border-cyber-purple/40 text-cyber-purple px-4 py-1.5 rounded transition-all"
              >
                Compile & Register
              </button>
            </div>
          </form>
        ) : (
          // Active List Section
          <div className="space-y-3">
            {activePlugins.map((plugin) => {
              // Custom plugins display a delete option
              const isCustom = !['browser', 'google', 'youtube', 'calculator', 'notes', 'clipboard', 'clock', 'weather', 'timer'].includes(plugin.id);
              
              return (
                <div 
                  key={plugin.id}
                  className="bg-slate-900/40 border border-white/5 hover:border-white/10 rounded-xl p-3.5 transition-all flex justify-between items-start"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-200 font-semibold text-xs">{plugin.name}</span>
                      <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                        isCustom 
                          ? 'bg-cyber-purple/15 text-cyber-purple border-cyber-purple/20' 
                          : 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan/20'
                      }`}>
                        {isCustom ? 'Custom SDK' : 'System'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{plugin.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plugin.intents.map(intent => (
                        <span 
                          key={intent}
                          className="text-[9px] font-mono bg-slate-950/70 border border-white/5 text-slate-400 px-1.5 py-0.5 rounded"
                        >
                          {intent}
                        </span>
                      ))}
                    </div>
                  </div>

                  {isCustom && (
                    <button
                      onClick={() => handleDelete(plugin.id)}
                      className="p-1 hover:bg-red-500/10 text-slate-600 hover:text-red-400 rounded transition-colors"
                      title="Delete Plugin"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
