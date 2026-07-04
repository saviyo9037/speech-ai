import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';
const baseURL = process.env.OPENAI_BASE_URL || undefined; // Will default to OpenAI default if undefined
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openai: OpenAI | null = null;
if (apiKey) {
  openai = new OpenAI({
    apiKey,
    baseURL,
  });
}

const SYSTEM_PROMPT = `You are the brain of "Nova", a premium AI-powered Voice Operating System.
Your job is to parse the user's speech and return a single, valid JSON object matching the requested action.

Supported Intents:
1. "open_browser"
   Parameters: { "site": "google" | "chatgpt" | "youtube" | "react" | "settings" }
   Description: Open a preconfigured website or the settings page.
2. "search_google"
   Parameters: { "query": string }
   Description: Search Google for the query.
3. "search_youtube"
   Parameters: { "query": string }
   Description: Search YouTube for the query.
4. "calculate"
   Parameters: { "expression": string }
   Description: Evaluate a mathematical expression safely (e.g. "5 * 10 + 2").
5. "notes_add"
   Parameters: { "content": string }
   Description: Add a new text note.
6. "notes_read"
   Parameters: { "query": string } (optional - word to search for in notes)
   Description: View notes.
7. "notes_delete"
   Parameters: { "id": string | number }
   Description: Delete a note by its ID.
8. "notes_list"
   Parameters: {}
   Description: List all saved notes.
9. "clipboard_write"
   Parameters: { "text": string }
   Description: Write text to the system clipboard.
10. "clipboard_read"
    Parameters: {}
    Description: Read and speak the text currently on the clipboard.
11. "get_time"
    Parameters: {}
    Description: Get the current time.
12. "get_date"
    Parameters: {}
    Description: Get today's date.
13. "get_weather"
    Parameters: { "location": string }
    Description: Check weather for a specific city.
14. "set_timer"
    Parameters: { "duration": number } (duration in seconds)
    Description: Start a countdown timer.
15. "repeat_last"
    Parameters: {}
    Description: Repeat the last response spoken by the AI.
16. "stop_speaking"
    Parameters: {}
    Description: Stop any active text-to-speech output immediately.
17. "conversation"
    Parameters: {}
    Description: Standard chat conversation. Use this if the user is just chatting or asking a general question that does not match a plugin command.

CRITICAL RULES:
1. You MUST respond with ONLY a valid JSON object. Do not include markdown code block syntax (like \`\`\`json) or any conversational text around the JSON.
2. The JSON schema must strictly contain:
   {
      "intent": "one_of_the_above_intents",
      "parameters": { ... },
      "response": "A natural spoken response explaining what you are doing (e.g. 'Opening the calculator.' or 'Sure, I have added the note to buy milk.')"
   }
3. Use the conversation history to resolve pronouns or contextual references (e.g. if the user says "Search React" then "Open it", resolve "Open it" to "open_browser" with site "react" or search_google with query "React").
4. If you do not understand or cannot map to a plugin, use the "conversation" intent and provide a helpful conversational response in the "response" field.`;

// Local NLP Fallback Matcher in case OpenAI API Key is missing
function localFallback(prompt: string): any {
  const text = prompt.toLowerCase().trim();

  // open settings
  if (text.includes('open settings') || text.includes('go to settings')) {
    return {
      intent: 'open_browser',
      parameters: { site: 'settings' },
      response: 'Opening the settings panel.',
    };
  }

  // open chatgpt
  if (text.includes('open chatgpt') || text.includes('open chat gpt') || text.includes('go to chatgpt')) {
    return {
      intent: 'open_browser',
      parameters: { site: 'chatgpt' },
      response: 'Opening ChatGPT in a new tab.',
    };
  }

  // open youtube
  if (text === 'open youtube' || text === 'go to youtube') {
    return {
      intent: 'open_browser',
      parameters: { site: 'youtube' },
      response: 'Opening YouTube.',
    };
  }

  // open google
  if (text === 'open google' || text === 'go to google') {
    return {
      intent: 'open_browser',
      parameters: { site: 'google' },
      response: 'Opening Google.',
    };
  }

  // open calculator / calculate
  if (text.includes('open calculator') || text.includes('open calc')) {
    return {
      intent: 'calculate',
      parameters: { expression: '0' },
      response: 'Opening the calculator.',
    };
  }

  // calculate math expressions
  if (text.startsWith('calculate') || text.includes('+') || text.includes('-') || text.includes('*') || text.includes('/') || text.startsWith('what is') || text.startsWith('solve')) {
    // Extract math content
    let expr = text.replace(/calculate|what is|solve/g, '').trim();
    // remove question marks
    expr = expr.replace(/\?/g, '').trim();
    if (expr.length > 0) {
      return {
        intent: 'calculate',
        parameters: { expression: expr },
        response: `Calculating ${expr}.`,
      };
    }
  }

  // search youtube
  if (text.startsWith('search youtube for') || text.startsWith('search youtube')) {
    const query = text.replace(/search youtube for|search youtube/g, '').trim();
    return {
      intent: 'search_youtube',
      parameters: { query },
      response: `Searching YouTube for ${query}.`,
    };
  }

  // search google
  if (text.startsWith('search for') || text.startsWith('search google for') || text.startsWith('search google') || text.startsWith('search')) {
    const query = text.replace(/search google for|search google|search for|search/g, '').trim();
    return {
      intent: 'search_google',
      parameters: { query },
      response: `Searching Google for ${query}.`,
    };
  }

  // timer
  if (text.includes('timer') || text.includes('set a timer') || text.includes('start a timer')) {
    // try to parse duration
    let seconds = 60;
    const matchSec = text.match(/(\d+)\s*sec/);
    const matchMin = text.match(/(\d+)\s*min/);
    if (matchSec) seconds = parseInt(matchSec[1], 10);
    else if (matchMin) seconds = parseInt(matchMin[1], 10) * 60;
    else {
      const matchNumber = text.match(/(\d+)/);
      if (matchNumber) seconds = parseInt(matchNumber[1], 10);
    }
    return {
      intent: 'set_timer',
      parameters: { duration: seconds },
      response: `Starting a timer for ${seconds} seconds.`,
    };
  }

  // clock/time
  if (text.includes('time') || text.includes('what time is it') || text.includes('current time')) {
    return {
      intent: 'get_time',
      parameters: {},
      response: 'Fetching the current time.',
    };
  }

  // clock/date
  if (text.includes('date') || text.includes('today') || text.includes("today's date")) {
    return {
      intent: 'get_date',
      parameters: {},
      response: "Checking today's date.",
    };
  }

  // weather
  if (text.includes('weather') || text.includes('temperature')) {
    // Extract city if present "weather in New York"
    const cityMatch = text.match(/(?:weather in|weather at|weather for)\s+([a-zA-Z\s]+)/);
    const location = cityMatch ? cityMatch[1].trim() : 'your location';
    return {
      intent: 'get_weather',
      parameters: { location },
      response: `Checking the weather for ${location}.`,
    };
  }

  // notes
  if (text.startsWith('add a note') || text.startsWith('add note') || text.startsWith('save note') || text.startsWith('create a note')) {
    const content = text.replace(/add a note|add note|save note|create a note/g, '').trim();
    return {
      intent: 'notes_add',
      parameters: { content: content || 'Empty note' },
      response: `Adding note: ${content || 'Empty note'}.`,
    };
  }

  if (text.includes('show notes') || text.includes('list notes') || text.includes('read my notes') || text.includes('view notes')) {
    return {
      intent: 'notes_list',
      parameters: {},
      response: 'Here are your saved notes.',
    };
  }

  if (text.startsWith('delete note') || text.startsWith('remove note')) {
    const id = text.replace(/delete note|remove note/g, '').trim();
    return {
      intent: 'notes_delete',
      parameters: { id },
      response: `Deleting note ${id}.`,
    };
  }

  // clipboard
  if (text.includes('copy to clipboard') || text.startsWith('copy') || text.startsWith('write to clipboard')) {
    const clipText = text.replace(/copy to clipboard|copy|write to clipboard/g, '').trim();
    return {
      intent: 'clipboard_write',
      parameters: { text: clipText || 'Hello from Nova' },
      response: `Writing text to clipboard.`,
    };
  }

  if (text.includes('read clipboard') || text.includes('what is on my clipboard') || text.includes('clipboard content')) {
    return {
      intent: 'clipboard_read',
      parameters: {},
      response: 'Reading clipboard contents.',
    };
  }

  // repeat/stop
  if (text.includes('repeat') || text.includes('say that again')) {
    return {
      intent: 'repeat_last',
      parameters: {},
      response: 'Repeating the last response.',
    };
  }

  if (text.includes('stop speaking') || text.includes('shut up') || text.includes('be quiet') || text.includes('stop talking')) {
    return {
      intent: 'stop_speaking',
      parameters: {},
      response: 'Stopping speech synthesis.',
    };
  }

  // Fallback to basic chat conversation
  return {
    intent: 'conversation',
    parameters: {},
    response: `I heard you say: "${prompt}". How can I help you today with your speech commands?`,
  };
}

export async function processSpeechInput(
  prompt: string,
  history: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<any> {
  // If OpenAI isn't configured, run fallback immediately
  if (!openai) {
    console.log('[LLMService] No API key configured. Running local fallback matcher.');
    return localFallback(prompt);
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt },
    ] as any[];

    console.log(`[LLMService] Sending request to model: ${model}`);
    const response = await openai.chat.completions.create({
      model,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.1, // low temperature for precise function calling
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Clean response content (sometimes LLMs wrap JSON in codeblocks even with json_object)
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    if (!parsed.intent || !parsed.response) {
      throw new Error("Invalid response format: 'intent' and 'response' are required.");
    }

    return parsed;
  } catch (error: any) {
    console.error('[LLMService] Error talking to OpenAI:', error);
    // If the API call fails (network error, rate limit, bad API key), fallback gracefully
    console.log('[LLMService] LLM execution failed. Running local fallback.');
    return localFallback(prompt);
  }
}
