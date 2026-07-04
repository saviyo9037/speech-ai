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

export class BrowserPlugin implements VoicePlugin {
  public id = 'browser';
  public name = 'Browser Manager';
  public description = 'Opens system settings or standard websites in new tabs.';
  public intents = ['open_browser'];

  public async execute(
    intent: string,
    parameters: Record<string, any>,
    context: PluginContext
  ): Promise<PluginExecutionResult> {
    console.log('Browser Plugin:', parameters);

    const site = String(parameters.site || '').toLowerCase().trim();

    let url = '';
    let name = '';

    if (site === 'google') {
      url = 'https://www.google.com';
      name = 'Google';
    } else if (site === 'chatgpt' || site === 'chat gpt') {
      url = 'https://chatgpt.com';
      name = 'ChatGPT';
    } else if (site === 'youtube') {
      url = 'https://www.youtube.com';
      name = 'YouTube';
    } else if (site === 'react' || site === 'react tutorials') {
      url = 'https://react.dev';
      name = 'React Documentation';
    } else if (site === 'settings') {
      return {
        success: true,
        message: 'Opening settings panel.',
        data: { panel: 'settings' }
      };
    } else if (site) {
      // Custom domain or fallback to Google search
      if (site.includes('.') || site.startsWith('localhost')) {
        url = site.startsWith('http') ? site : `https://${site}`;
        name = site;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(site)}`;
        name = `Google search for ${site}`;
      }
    }

    if (url) {
      openTab(url);
      return {
        success: true,
        message: `Opened ${name}.`,
        data: { url }
      };
    }

    return {
      success: false,
      message: 'Invalid browser target specified.'
    };
  }
}
