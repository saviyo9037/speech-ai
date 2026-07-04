import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class CalculatorPlugin implements VoicePlugin {
  public id = 'calculator';
  public name = 'Calculator';
  public description = 'Evaluates mathematical equations safely.';
  public intents = ['calculate'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    const expr = String(parameters.expression || '').trim();

    // Check if the user just wants to open the calculator interface
    if (!expr || expr === '0' || expr === '') {
      return {
        success: true,
        message: 'Calculator is ready.',
        data: { value: 0, showUI: true }
      };
    }

    try {
      // Sanitize the expression to allow only numbers, operators, decimals, spaces, and brackets
      const cleanExpr = expr.replace(/[^0-9+\-*/().\s]/g, '');

      if (!cleanExpr.trim()) {
        throw new Error('Contains invalid mathematical symbols');
      }

      // Safe arithmetic evaluation
      const result = new Function(`return (${cleanExpr})`)();

      if (result === undefined || isNaN(result) || !isFinite(result)) {
        throw new Error('Result is not a finite number');
      }

      // Round to 4 decimal places if it's a decimal
      const formattedResult = Number(result.toFixed(4)).toString();

      return {
        success: true,
        message: `The result of ${expr} is ${formattedResult}.`,
        data: { expression: expr, result: formattedResult }
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Could not compute calculation: ${e.message}`,
        data: { expression: expr }
      };
    }
  }
}
