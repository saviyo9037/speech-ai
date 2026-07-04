"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSarvamConfigured = isSarvamConfigured;
exports.sarvamSTT = sarvamSTT;
exports.sarvamTTS = sarvamTTS;
const form_data_1 = __importDefault(require("form-data"));
const axios_1 = __importStar(require("axios"));
// ---- Configuration (loaded from .env) ----------------------------------------
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_STT_URL = process.env.SARVAM_STT_URL || 'https://api.sarvam.ai/speech-to-text';
const SARVAM_TTS_URL = process.env.SARVAM_TTS_URL || 'https://api.sarvam.ai/text-to-speech';
const SARVAM_LANGUAGE = process.env.SARVAM_LANGUAGE || 'en-IN';
const SARVAM_SPEAKER = process.env.SARVAM_SPEAKER || 'meera';
const SARVAM_TTS_MODEL = process.env.SARVAM_TTS_MODEL || 'bulbul:v1';
const SARVAM_STT_MODEL = process.env.SARVAM_STT_MODEL || 'saarika:v2';
// Request timeout in milliseconds
const TIMEOUT_MS = 30_000;
// ---- Helpers ------------------------------------------------------------------
/**
 * Returns true if the Sarvam API key is configured.
 * Used by routes to detect fallback conditions before calling the API.
 */
function isSarvamConfigured() {
    return SARVAM_API_KEY.length > 0 && SARVAM_API_KEY !== 'your_sarvam_api_key_here';
}
/**
 * Extracts a readable error message from an Axios error.
 */
function extractErrorMessage(error) {
    if (error instanceof axios_1.AxiosError) {
        const data = error.response?.data;
        if (data) {
            return typeof data === 'string'
                ? data
                : (data.message || data.error || JSON.stringify(data));
        }
        return error.message;
    }
    return String(error);
}
/**
 * Sends an audio buffer to the Sarvam AI STT API and returns the transcript.
 *
 * @param audioBuffer  Raw audio bytes (webm / wav / mp3)
 * @param filename     Original filename including extension (e.g. "audio.webm")
 * @param languageCode BCP-47 language code — use 'unknown' for auto-detect
 */
async function sarvamSTT(audioBuffer, filename, languageCode = SARVAM_LANGUAGE) {
    if (!isSarvamConfigured()) {
        throw new Error('Sarvam API key is not configured on the backend.');
    }
    // Determine audio MIME type from the filename extension
    let contentType = 'audio/wav';
    if (filename.endsWith('.webm'))
        contentType = 'audio/webm';
    else if (filename.endsWith('.mp3'))
        contentType = 'audio/mpeg';
    else if (filename.endsWith('.ogg'))
        contentType = 'audio/ogg';
    const form = new form_data_1.default();
    form.append('file', audioBuffer, { filename, contentType });
    form.append('model', SARVAM_STT_MODEL);
    // Sarvam uses 'en-IN' — normalise browser's 'en-US' automatically
    form.append('language_code', languageCode === 'en-US' ? 'unknown' : languageCode);
    console.log(`[SarvamSTT] Sending ${audioBuffer.byteLength} bytes → ${SARVAM_STT_URL}`);
    try {
        const response = await axios_1.default.post(SARVAM_STT_URL, form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': SARVAM_API_KEY,
            },
            timeout: TIMEOUT_MS,
        });
        const transcript = response.data?.transcript || '';
        const returnedLang = response.data?.language_code || languageCode;
        console.log(`[SarvamSTT] Transcript: "${transcript}" (lang: ${returnedLang})`);
        return { transcript, languageCode: returnedLang };
    }
    catch (err) {
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
async function sarvamTTS(text, languageCode = SARVAM_LANGUAGE, speaker = SARVAM_SPEAKER, pace = 1.0, loudness = 1.5) {
    if (!isSarvamConfigured()) {
        throw new Error('Sarvam API key is not configured on the backend.');
    }
    if (!text || !text.trim()) {
        throw new Error('Text to synthesize cannot be empty.');
    }
    // Sarvam TTS accepts up to ~500 chars — truncate gracefully
    const safeText = text.trim().slice(0, 500);
    console.log(`[SarvamTTS] Synthesizing (${safeText.length} chars) speaker=${speaker} lang=${languageCode}`);
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
        const response = await axios_1.default.post(SARVAM_TTS_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'api-subscription-key': SARVAM_API_KEY,
            },
            timeout: TIMEOUT_MS,
        });
        const audios = response.data?.audios;
        if (!audios || audios.length === 0) {
            throw new Error('Sarvam TTS returned no audio data.');
        }
        console.log(`[SarvamTTS] Audio received, base64 length: ${audios[0].length}`);
        return audios[0]; // base64-encoded WAV
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        console.error(`[SarvamTTS] API error: ${msg}`);
        throw new Error(`Sarvam TTS failed: ${msg}`);
    }
}
