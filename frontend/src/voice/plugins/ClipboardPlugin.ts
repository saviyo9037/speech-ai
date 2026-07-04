import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

export class ClipboardPlugin implements VoicePlugin {
  public id = 'clipboard';
  public name = 'Clipboard Copier';
  public description = 'Reads from or writes text snippets to the system clipboard.';
  public intents = ['clipboard_write', 'clipboard_read'];
  private localClipboardBackup = 'Welcome to Nova Operating System.';

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    if (intent === 'clipboard_write') {
      const text = String(parameters.text || '').trim();
      if (!text) {
        return {
          success: false,
          message: 'Nothing was provided to copy.'
        };
      }

      try {
        await navigator.clipboard.writeText(text);
        this.localClipboardBackup = text;
        return {
          success: true,
          message: `Successfully copied "${text}" to clipboard.`,
          data: { text }
        };
      } catch (e) {
        this.localClipboardBackup = text;
        return {
          success: true,
          message: 'Saved to internal assistant buffer (browser write blocked).',
          data: { text }
        };
      }
    }

    if (intent === 'clipboard_read') {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) {
          return {
            success: true,
            message: 'Your clipboard is currently empty.'
          };
        }
        return {
          success: true,
          message: `The clipboard contains: "${text}".`,
          data: { text }
        };
      } catch (e) {
        return {
          success: true,
          message: `Unable to read system clipboard directly. My local buffer contains: "${this.localClipboardBackup}".`,
          data: { text: this.localClipboardBackup }
        };
      }
    }

    return {
      success: false,
      message: `Invalid clipboard intent: ${intent}`
    };
  }
}
