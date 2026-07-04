import { AIResponse } from '../types';

export class IntentParser {
  public static parse(payload: any): AIResponse {
    let parsed: any = payload;

    if (typeof payload === 'string') {
      try {
        let cleaned = payload.trim();
        // Remove markdown wrappers if any exist
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        }
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error('[IntentParser] JSON parsing failed, defaulting to conversational speech:', e);
        return {
          intent: 'conversation',
          parameters: {},
          response: typeof payload === 'string' ? payload : 'I was unable to parse that command.',
        };
      }
    }

    const intent = parsed?.intent || 'conversation';
    const parameters = parsed?.parameters || {};
    const responseText = parsed?.response || '';

    return {
      intent,
      parameters: typeof parameters === 'object' ? parameters : {},
      response: responseText,
    };
  }
}
