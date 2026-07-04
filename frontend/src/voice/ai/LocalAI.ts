import { AIEngine, AIResponse, ConversationMessage, VoiceConfig } from '../types';

export class LocalAI implements AIEngine {
  public async process(
    prompt: string,
    history: ConversationMessage[],
    config: VoiceConfig
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      const text = prompt.toLowerCase().trim();

      // Open settings
      if (text.includes('open settings') || text.includes('go to settings')) {
        resolve({
          intent: 'open_browser',
          parameters: { site: 'settings' },
          response: 'Opening the settings panel.',
        });
        return;
      }

      // Open chatgpt
      if (text.includes('open chatgpt') || text.includes('open chat gpt') || text.includes('go to chatgpt')) {
        resolve({
          intent: 'open_browser',
          parameters: { site: 'chatgpt' },
          response: 'Opening ChatGPT in a new tab.',
        });
        return;
      }

      // Open youtube
      if (text === 'open youtube' || text === 'go to youtube') {
        resolve({
          intent: 'open_browser',
          parameters: { site: 'youtube' },
          response: 'Opening YouTube.',
        });
        return;
      }

      // Open google
      if (text === 'open google' || text === 'go to google') {
        resolve({
          intent: 'open_browser',
          parameters: { site: 'google' },
          response: 'Opening Google.',
        });
        return;
      }

      // Calculate expressions or Open Calculator
      if (text.includes('open calculator') || text.includes('open calc')) {
        resolve({
          intent: 'calculate',
          parameters: { expression: '0' },
          response: 'Opening the calculator.',
        });
        return;
      }

      if (
        text.startsWith('calculate') || 
        text.includes('+') || 
        text.includes('-') || 
        text.includes('*') || 
        text.includes('/') || 
        text.startsWith('what is') || 
        text.startsWith('solve')
      ) {
        let expr = text.replace(/calculate|what is|solve/g, '').trim();
        expr = expr.replace(/\?/g, '').trim();
        if (expr.length > 0) {
          resolve({
            intent: 'calculate',
            parameters: { expression: expr },
            response: `Calculating ${expr}.`,
          });
          return;
        }
      }

      // Search YouTube
      if (text.startsWith('search youtube for') || text.startsWith('search youtube')) {
        const query = text.replace(/search youtube for|search youtube/g, '').trim();
        resolve({
          intent: 'search_youtube',
          parameters: { query },
          response: `Searching YouTube for ${query}.`,
        });
        return;
      }

      // Search Google
      if (
        text.startsWith('search for') || 
        text.startsWith('search google for') || 
        text.startsWith('search google') || 
        text.startsWith('search')
      ) {
        const query = text.replace(/search google for|search google|search for|search/g, '').trim();
        resolve({
          intent: 'search_google',
          parameters: { query },
          response: `Searching Google for ${query}.`,
        });
        return;
      }

      // Timer
      if (text.includes('timer') || text.includes('set a timer') || text.includes('start a timer')) {
        let seconds = 60;
        const matchSec = text.match(/(\d+)\s*sec/);
        const matchMin = text.match(/(\d+)\s*min/);
        if (matchSec) {
          seconds = parseInt(matchSec[1], 10);
        } else if (matchMin) {
          seconds = parseInt(matchMin[1], 10) * 60;
        } else {
          const matchNumber = text.match(/(\d+)/);
          if (matchNumber) seconds = parseInt(matchNumber[1], 10);
        }
        resolve({
          intent: 'set_timer',
          parameters: { duration: seconds },
          response: `Starting a timer for ${seconds} seconds.`,
        });
        return;
      }

      // Clock (Time / Date)
      if (text.includes('time') || text.includes('what time is it') || text.includes('current time')) {
        resolve({
          intent: 'get_time',
          parameters: {},
          response: 'Fetching the current time.',
        });
        return;
      }

      if (text.includes('date') || text.includes('today') || text.includes("today's date")) {
        resolve({
          intent: 'get_date',
          parameters: {},
          response: "Checking today's date.",
        });
        return;
      }

      // Weather
      if (text.includes('weather') || text.includes('temperature')) {
        const cityMatch = text.match(/(?:weather in|weather at|weather for)\s+([a-zA-Z\s]+)/);
        const location = cityMatch ? cityMatch[1].trim() : 'your location';
        resolve({
          intent: 'get_weather',
          parameters: { location },
          response: `Checking the weather for ${location}.`,
        });
        return;
      }

      // Notes
      if (
        text.startsWith('add a note') || 
        text.startsWith('add note') || 
        text.startsWith('save note') || 
        text.startsWith('create a note')
      ) {
        const content = text.replace(/add a note|add note|save note|create a note/g, '').trim();
        resolve({
          intent: 'notes_add',
          parameters: { content: content || 'Empty note' },
          response: `Adding note: ${content || 'Empty note'}.`,
        });
        return;
      }

      if (
        text.includes('show notes') || 
        text.includes('list notes') || 
        text.includes('read my notes') || 
        text.includes('view notes')
      ) {
        resolve({
          intent: 'notes_list',
          parameters: {},
          response: 'Here are your saved notes.',
        });
        return;
      }

      if (text.startsWith('delete note') || text.startsWith('remove note')) {
        const id = text.replace(/delete note|remove note/g, '').trim();
        resolve({
          intent: 'notes_delete',
          parameters: { id },
          response: `Deleting note ${id}.`,
        });
        return;
      }

      // Clipboard
      if (
        text.includes('copy to clipboard') || 
        text.startsWith('copy') || 
        text.startsWith('write to clipboard')
      ) {
        const clipText = text.replace(/copy to clipboard|copy|write to clipboard/g, '').trim();
        resolve({
          intent: 'clipboard_write',
          parameters: { text: clipText || 'Hello from Nova' },
          response: 'Writing text to clipboard.',
        });
        return;
      }

      if (
        text.includes('read clipboard') || 
        text.includes('what is on my clipboard') || 
        text.includes('clipboard content')
      ) {
        resolve({
          intent: 'clipboard_read',
          parameters: {},
          response: 'Reading clipboard contents.',
        });
        return;
      }

      // Repeat / Stop
      if (text.includes('repeat') || text.includes('say that again')) {
        resolve({
          intent: 'repeat_last',
          parameters: {},
          response: 'Repeating the last response.',
        });
        return;
      }

      if (
        text.includes('stop speaking') || 
        text.includes('shut up') || 
        text.includes('be quiet') || 
        text.includes('stop talking')
      ) {
        resolve({
          intent: 'stop_speaking',
          parameters: {},
          response: 'Stopping speech synthesis.',
        });
        return;
      }

      // Context resolution for follow ups (mock context parsing)
      if (
        history.length > 0 && 
        (text.includes('first result') || text.includes('open it') || text.includes('open first'))
      ) {
        // Find last search intent in history
        const lastSearch = [...history].reverse().find(
          h => h.intent === 'search_google' || h.intent === 'search_youtube'
        );
        if (lastSearch) {
          // Open the search query as a browser site or google query
          resolve({
            intent: 'open_browser',
            parameters: { site: lastSearch.intent === 'search_youtube' ? 'youtube' : 'google' },
            response: 'Opening the search results tab.',
          });
          return;
        }
      }

      // Standard conversation fallback
      resolve({
        intent: 'conversation',
        parameters: {},
        response: `[Local Fallback] How can I assist you with settings, calculations, web searches, timers, clipboard, or notes?`,
      });
    });
  }
}
