"use strict";
/**
 * sarvamRoutes.ts
 * Express router that exposes backend proxy endpoints for Sarvam AI.
 *
 *   POST /api/sarvam/stt  — receives audio blob → returns { transcript }
 *   POST /api/sarvam/tts  — receives text JSON  → returns { audio: base64 }
 *   GET  /api/sarvam/status — reports API key status
 *
 * The API key lives ONLY here on the backend. The frontend never touches it.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sarvamService_js_1 = require("../services/sarvamService.js");
const router = (0, express_1.Router)();
// Use in-memory storage — audio blobs are small, no need to write to disk
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});
// ---- GET /api/sarvam/status ---------------------------------------------------
router.get('/status', (_req, res) => {
    res.json({
        sarvamConfigured: (0, sarvamService_js_1.isSarvamConfigured)(),
        sttUrl: process.env.SARVAM_STT_URL || 'https://api.sarvam.ai/speech-to-text',
        ttsUrl: process.env.SARVAM_TTS_URL || 'https://api.sarvam.ai/text-to-speech',
        language: process.env.SARVAM_LANGUAGE || 'en-IN',
        speaker: process.env.SARVAM_SPEAKER || 'meera',
    });
});
// ---- POST /api/sarvam/stt ----------------------------------------------------
/**
 * Accepts a multipart audio upload and returns a plain-text transcript.
 *
 * Request body (multipart/form-data):
 *   file          — audio blob (webm / wav / mp3)
 *   language_code — optional BCP-47 code (default: env SARVAM_LANGUAGE)
 *
 * Success response:
 *   { transcript: string, languageCode: string }
 *
 * Error response (when Sarvam unavailable):
 *   { error: string, fallback: true }
 */
router.post('/stt', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Audio file is required. Send as multipart field "file".' });
            return;
        }
        if (!(0, sarvamService_js_1.isSarvamConfigured)()) {
            // Signal the frontend to use its Browser STT fallback
            res.status(503).json({
                error: 'Sarvam API key not configured.',
                fallback: true,
            });
            return;
        }
        const languageCode = req.body?.language_code
            || process.env.SARVAM_LANGUAGE
            || 'unknown';
        const result = await (0, sarvamService_js_1.sarvamSTT)(req.file.buffer, req.file.originalname || 'audio.webm', languageCode);
        res.json({ transcript: result.transcript, languageCode: result.languageCode });
    }
    catch (error) {
        console.error('[/api/sarvam/stt] Error:', error.message);
        res.status(500).json({
            error: 'Sarvam STT request failed.',
            message: error.message,
            fallback: true, // instruct frontend to try Browser STT fallback
        });
    }
});
// ---- POST /api/sarvam/tts ----------------------------------------------------
/**
 * Accepts a JSON body and returns base64-encoded WAV audio.
 *
 * Request body (application/json):
 *   text          — string to synthesize (required)
 *   language_code — optional BCP-47 code
 *   speaker       — optional speaker ID
 *   pace          — optional number 0.5–2.0
 *   loudness      — optional number 0.5–2.0
 *
 * Success response:
 *   { audio: string }   ← base64-encoded WAV
 *
 * Error response (when Sarvam unavailable):
 *   { error: string, fallback: true }
 */
router.post('/tts', async (req, res) => {
    try {
        const { text, language_code, speaker, pace, loudness } = req.body;
        if (!text || typeof text !== 'string' || !text.trim()) {
            res.status(400).json({ error: 'Request body must include a non-empty "text" field.' });
            return;
        }
        if (!(0, sarvamService_js_1.isSarvamConfigured)()) {
            res.status(503).json({
                error: 'Sarvam API key not configured.',
                fallback: true,
            });
            return;
        }
        const audioBase64 = await (0, sarvamService_js_1.sarvamTTS)(text, language_code || process.env.SARVAM_LANGUAGE || 'en-IN', speaker || process.env.SARVAM_SPEAKER || 'meera', typeof pace === 'number' ? pace : 1.0, typeof loudness === 'number' ? loudness : 1.5);
        res.json({ audio: audioBase64 });
    }
    catch (error) {
        console.error('[/api/sarvam/tts] Error:', error.message);
        res.status(500).json({
            error: 'Sarvam TTS request failed.',
            message: error.message,
            fallback: true,
        });
    }
});
exports.default = router;
