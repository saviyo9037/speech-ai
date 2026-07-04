/**
 * sarvamService.ts
 * Backend service that proxies requests to the Sarvam AI speech APIs.
 *
 * Architecture:
 *   Frontend → /api/sarvam/stt → sarvamSTT() → Sarvam AI STT → transcript
 *   Frontend → /api/sarvam/tts → sarvamTTS() → Sarvam AI TTS → base64 audio
 *
 * The API key is stored exclusively on the backend and never sent to the browser.
 */

import FormData from 'form-data';
import axios, { AxiosError } from 'axios';

// ---- Configuration (loaded from .env) ----------------------------------------

const SARVAM_API_KEY   = process.env.SARVAM_API_KEY   || '';
const SARVAM_STT_URL   = process.env.SARVAM_STT_URL   || 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL   = process.env.SARVAM_TTS_URL   || 'https://api.sarvam.ai/text-to-speech';
const SARVAM_LANGUAGE  = process.env.SARVAM_LANGUAGE  || 'en-IN';
const SARVAM_SPEAKER   = process.env.SARVAM_SPEAKER   || 'meera';
const SARVAM_TTS_MODEL = process.env.SARVAM_TTS_MODEL || 'bulbul:v1';
const SARVAM_STT_MODEL = process.env.SARVAM_STT_MODEL || 'saarika:v2.5';

// Request timeout in milliseconds
const TIMEOUT_MS = 30_000;

// ---- Helpers ------------------------------------------------------------------

/**
 * Returns true if the Sarvam API key is configured.
 * Used by routes to detect fallback conditions before calling the API.
 */
export function isSarvamConfigured(): boolean {
  return SARVAM_API_KEY.length > 0 && SARVAM_API_KEY !== 'your_sarvam_api_key_here';
}

/**
 * Extracts a readable, fully-serialised error message from any error type.
 *
 * Root cause of the previous [object Object]:
 *   data.message || data.error can itself be an object (not a string).
 *   Template literals then call .toString() → "[object Object]".
 *
 * Fix: always JSON.stringify the full response body so nothing is hidden.
 */
function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 'no-response';
    const data   = error.response?.data;

    if (data !== undefined && data !== null) {
      // Safely serialise whatever Sarvam returns — object, string, or anything else
      let bodyStr: string;
      try {
        bodyStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      } catch {
        bodyStr = String(data);
      }
      return `HTTP ${status} — ${bodyStr}`;
    }

    // No response body — use Axios message + status
    return `HTTP ${status} — ${error.message}`;
  }

  if (error instanceof Error) return error.message;

  // Absolute fallback — safely serialise anything
  try { return JSON.stringify(error); } catch { return String(error); }
}


// ---- Speech-to-Text -----------------------------------------------------------

export interface SarvamSTTResult {
  transcript: string;
  languageCode: string;
}

/**
 * Sends an audio buffer to the Sarvam AI STT API and returns the transcript.
 *
 * @param audioBuffer  Raw audio bytes (webm / wav / mp3)
 * @param filename     Original filename including extension (e.g. "audio.webm")
 * @param languageCode BCP-47 language code — use 'unknown' for auto-detect
 */
export async function sarvamSTT(
  audioBuffer: Buffer,
  filename: string,
  languageCode: string = SARVAM_LANGUAGE
): Promise<SarvamSTTResult> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam API key is not configured on the backend.');
  }

  // Determine audio MIME type from the filename extension
  let contentType = 'audio/wav';
  if (filename.endsWith('.webm')) contentType = 'audio/webm';
  else if (filename.endsWith('.mp3'))  contentType = 'audio/mpeg';
  else if (filename.endsWith('.ogg'))  contentType = 'audio/ogg';

  const form = new FormData();
  form.append('file', audioBuffer, { filename, contentType });
  form.append('model', SARVAM_STT_MODEL);
  // Sarvam uses 'en-IN' — normalise browser's 'en-US' automatically
  form.append('language_code', languageCode === 'en-US' ? 'unknown' : languageCode);

  console.log(`[SarvamSTT] Sending ${audioBuffer.byteLength} bytes → ${SARVAM_STT_URL}`);

  try {
    const response = await axios.post(SARVAM_STT_URL, form, {
      headers: {
        ...form.getHeaders(),
        'api-subscription-key': SARVAM_API_KEY,
      },
      timeout: TIMEOUT_MS,
    });

    const transcript: string  = response.data?.transcript    || '';
    const returnedLang: string = response.data?.language_code || languageCode;

    console.log(`[SarvamSTT] Transcript: "${transcript}" (lang: ${returnedLang})`);
    return { transcript, languageCode: returnedLang };

  } catch (err) {
    const msg = extractErrorMessage(err);
    console.error(`[SarvamSTT] API error: ${msg}`);
    throw new Error(`Sarvam STT failed: ${msg}`);
  }
}

// ---- Text-to-Speech -----------------------------------------------------------

/**
 * Sends text to the Sarvam AI TTS API.
 * Returns a base64-encoded WAV audio string.
 *
 * @param text         Text to synthesize (max ~500 chars per request)
 * @param languageCode Target language BCP-47 code (default: from .env)
 * @param speaker      Speaker voice ID (default: from .env)
 * @param pace         Speech pace multiplier 0.5–2.0 (default: 1.0)
 * @param loudness     Audio loudness multiplier 0.5–2.0 (default: 1.5)
 */
export async function sarvamTTS(
  text: string,
  languageCode: string = SARVAM_LANGUAGE,
  speaker: string      = SARVAM_SPEAKER,
  pace: number         = 1.0,
  loudness: number     = 1.5
): Promise<string> {
  if (!isSarvamConfigured()) {
    throw new Error('Sarvam API key is not configured on the backend.');
  }

  if (!text || !text.trim()) {
    throw new Error('Text to synthesize cannot be empty.');
  }

  // Sarvam TTS accepts up to ~500 chars — truncate gracefully
  const safeText = text.trim().slice(0, 500);

  console.log(
    `[SarvamTTS] Synthesizing (${safeText.length} chars) speaker=${speaker} lang=${languageCode}`
  );

  const payload = {
    inputs: [safeText],
    target_language_code: languageCode === 'en-US' ? 'en-IN' : languageCode,
    speaker,
    model: SARVAM_TTS_MODEL,
    pace,
    loudness,
    enable_preprocessing: true,
  };

  try {
    const response = await axios.post(SARVAM_TTS_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': SARVAM_API_KEY,
      },
      timeout: TIMEOUT_MS,
    });

    const audios: string[] | undefined = response.data?.audios;
    if (!audios || audios.length === 0) {
      throw new Error('Sarvam TTS returned no audio data.');
    }

    console.log(`[SarvamTTS] Audio received, base64 length: ${audios[0].length}`);
    return audios[0]; // base64-encoded WAV

  } catch (err) {
    const msg = extractErrorMessage(err);
    console.error(`[SarvamTTS] API error: ${msg}`);
    throw new Error(`Sarvam TTS failed: ${msg}`);
  }
}
