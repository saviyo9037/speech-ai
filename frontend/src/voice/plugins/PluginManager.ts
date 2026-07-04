import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class PluginManager {
  private plugins: Map<string, VoicePlugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  public register(plugin: VoicePlugin): void {
    this.plugins.set(plugin.id, plugin);
    this.context.terminalLog('SYSTEM', `Registered plugin: ${plugin.name} (${plugin.id})`);
  }

  public unregister(id: string): void {
    if (this.plugins.has(id)) {
      const plugin = this.plugins.get(id);
      this.plugins.delete(id);
      this.context.terminalLog('SYSTEM', `Unregistered plugin: ${plugin?.name}`);
    }
  }

  public getPlugins(): VoicePlugin[] {
    return Array.from(this.plugins.values());
  }

  public getPlugin(id: string): VoicePlugin | undefined {
    return this.plugins.get(id);
  }

  public findPluginForIntent(intent: string): VoicePlugin | undefined {
    return this.getPlugins().find((p) => p.intents.includes(intent));
  }

  public async executeIntent(
    intent: string,
    parameters: Record<string, any>
  ): Promise<PluginExecutionResult> {
    const plugin = this.findPluginForIntent(intent);
    
    if (!plugin) {
      this.context.terminalLog('ERROR', `No plugin registered for intent: "${intent}"`);
      return {
        success: false,
        message: `No plugin matches the intent: ${intent}`,
      };
    }

    this.context.terminalLog('EXECUTOR', `Routing intent "${intent}" to plugin "${plugin.name}"`);
    
    try {
      const result = await plugin.execute(intent, parameters, this.context);
      if (result.success) {
        this.context.terminalLog('PLUGIN', `Execution successful: ${result.message}`);
      } else {
        this.context.terminalLog('ERROR', `Plugin execution failed: ${result.message}`);
      }
      return result;
    } catch (e: any) {
      this.context.terminalLog('ERROR', `Exception running plugin ${plugin.name}: ${e.message}`);
      return {
        success: false,
        message: `An error occurred while executing the command: ${e.message}`,
      };
    }
  }
}
