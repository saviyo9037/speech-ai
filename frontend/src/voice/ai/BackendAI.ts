import { AIEngine, AIResponse, ConversationMessage, VoiceConfig } from '../types';

export class BackendAI implements AIEngine {
  public async process(
    prompt: string,
    history: ConversationMessage[],
    config: VoiceConfig
  ): Promise<AIResponse> {
    const url = `${config.backendUrl || 'http://localhost:5000'}/api/process`;

    // Map conversation history format to what the backend expects
    const mappedHistory = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      console.log(`[BackendAI] Sending prompt to backend: "${prompt}"`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          history: mappedHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.intent || !data.response) {
        throw new Error('Invalid response structure from backend');
      }

      return data as AIResponse;
    } catch (e: any) {
      console.error('[BackendAI] Error processing backend AI request:', e);
      throw e; // Bubble up so the manager can fall back to LocalAI
    }
  }
}
