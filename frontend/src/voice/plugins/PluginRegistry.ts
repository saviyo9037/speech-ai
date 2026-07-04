import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';
import { BrowserPlugin } from './BrowserPlugin';
import { GooglePlugin } from './GooglePlugin';
import { YoutubePlugin } from './YoutubePlugin';
import { CalculatorPlugin } from './CalculatorPlugin';
import { NotesPlugin } from './NotesPlugin';
import { ClipboardPlugin } from './ClipboardPlugin';
import { ClockPlugin } from './ClockPlugin';
import { WeatherPlugin } from './WeatherPlugin';
import { TimerPlugin } from './TimerPlugin';

export function getBuiltInPlugins(): VoicePlugin[] {
  return [
    new BrowserPlugin(),
    new GooglePlugin(),
    new YoutubePlugin(),
    new CalculatorPlugin(),
    new NotesPlugin(),
    new ClipboardPlugin(),
    new ClockPlugin(),
    new WeatherPlugin(),
    new TimerPlugin(),
  ];
}

export interface CustomPluginDef {
  id: string;
  name: string;
  description: string;
  intents: string[];
  code: string; // JS function body
}

export class CustomVoicePlugin implements VoicePlugin {
  public id: string;
  public name: string;
  public description: string;
  public intents: string[];
  private code: string;

  constructor(def: CustomPluginDef) {
    this.id = def.id;
    this.name = def.name;
    this.description = def.description;
    this.intents = def.intents;
    this.code = def.code;
  }

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    try {
      // Build function with access to intent, parameters, and context arguments
      const runFn = new Function('intent', 'parameters', 'context', this.code);
      const result = await runFn(intent, parameters, context);
      
      return result || { success: true, message: 'Custom plugin execution completed.' };
    } catch (e: any) {
      return {
        success: false,
        message: `Custom plugin error: ${e.message}`,
      };
    }
  }
}

export function getCustomPlugins(): VoicePlugin[] {
  try {
    const raw = localStorage.getItem('nova_custom_plugins');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomPluginDef[];
    return parsed.map((def) => new CustomVoicePlugin(def));
  } catch (e) {
    console.error('[PluginRegistry] Failed to load custom plugins:', e);
    return [];
  }
}

export function saveCustomPlugin(def: CustomPluginDef): void {
  try {
    const raw = localStorage.getItem('nova_custom_plugins');
    const list = raw ? (JSON.parse(raw) as CustomPluginDef[]) : [];
    
    // Overwrite existing or push new
    const filtered = list.filter((p) => p.id !== def.id);
    filtered.push(def);
    
    localStorage.setItem('nova_custom_plugins', JSON.stringify(filtered));
  } catch (e) {
    console.error('[PluginRegistry] Failed to save custom plugin:', e);
  }
}

export function deleteCustomPlugin(id: string): void {
  try {
    const raw = localStorage.getItem('nova_custom_plugins');
    if (!raw) return;
    const list = JSON.parse(raw) as CustomPluginDef[];
    const filtered = list.filter((p) => p.id !== id);
    localStorage.setItem('nova_custom_plugins', JSON.stringify(filtered));
  } catch (e) {
    console.error('[PluginRegistry] Failed to delete custom plugin:', e);
  }
}
