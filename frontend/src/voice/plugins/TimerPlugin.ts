import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class TimerPlugin implements VoicePlugin {
  public id = 'timer';
  public name = 'Countdown Timer';
  public description = 'Sets a visual countdown timer in seconds.';
  public intents = ['set_timer'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const duration = Number(parameters.duration);

    if (isNaN(duration) || duration <= 0) {
      return {
        success: false,
        message: 'Please specify a valid duration in seconds.'
      };
    }

    context.setTimer(duration);

    return {
      success: true,
      message: `I have started a timer for ${duration} seconds.`,
      data: { duration }
    };
  }
}
