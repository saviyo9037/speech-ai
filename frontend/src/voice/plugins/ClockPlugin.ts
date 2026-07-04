import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class ClockPlugin implements VoicePlugin {
  public id = 'clock';
  public name = 'Clock & Calendar';
  public description = 'Reads current system time and date details.';
  public intents = ['get_time', 'get_date'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const now = new Date();

    if (intent === 'get_time') {
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        success: true,
        message: `The current time is ${timeStr}.`,
        data: { time: timeStr }
      };
    }

    if (intent === 'get_date') {
      const dateStr = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      return {
        success: true,
        message: `Today is ${dateStr}.`,
        data: { date: dateStr }
      };
    }

    return {
      success: false,
      message: `Invalid clock intent: ${intent}`
    };
  }
}
