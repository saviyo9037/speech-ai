export class FunctionParser {
  /**
   * Coerces raw AI parameters to match target schema types (string, number, boolean)
   */
  public static parseParams(
    parameters: Record<string, any>,
    schema: Record<string, 'string' | 'number' | 'boolean'>
  ): Record<string, any> {
    const casted: Record<string, any> = {};

    for (const [key, expectedType] of Object.entries(schema)) {
      const val = parameters[key];

      if (val === undefined || val === null) {
        if (expectedType === 'string') casted[key] = '';
        else if (expectedType === 'number') casted[key] = 0;
        else if (expectedType === 'boolean') casted[key] = false;
        continue;
      }

      if (expectedType === 'string') {
        casted[key] = String(val);
      } else if (expectedType === 'number') {
        const num = Number(val);
        casted[key] = isNaN(num) ? 0 : num;
      } else if (expectedType === 'boolean') {
        if (typeof val === 'string') {
          casted[key] = val.toLowerCase() === 'true';
        } else {
          casted[key] = Boolean(val);
        }
      }
    }

    return casted;
  }
}
