import { VoicePlugin, PluginContext, PluginExecutionResult } from '../types';

// Reliable cross-browser tab opener that bypasses async popup blockers.
// window.open() called from inside Promise chains gets blocked by browsers.
// Creating a real anchor element and dispatching a click event bypasses this.
function openTab(url: string): void {
  console.log('[openTab] Attempting to open:', url);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  console.log('[openTab] Anchor click dispatched for:', url);
}

export class GooglePlugin implements VoicePlugin {
  public id = 'google';
  public name = 'Google Search';
  public description = 'Searches Google for the specified query.';
  public intents = ['search_google'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    console.log('Google Plugin:', parameters);

    const query = String(parameters.query || '').trim();

    if (!query) {
      return {
        success: false,
        message: 'Google search requires a search query.'
      };
    }

    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    openTab(url);

    return {
      success: true,
      message: `Searching Google for "${query}".`,
      data: { query, url }
    };
  }
}
