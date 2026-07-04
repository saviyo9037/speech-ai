"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const llmService_js_1 = require("./services/llmService.js");
const sarvamRoutes_js_1 = __importDefault(require("./routes/sarvamRoutes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable CORS for frontend requests
app.use((0, cors_1.default)({
    origin: '*', // In production, replace with specific frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Logger middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Sarvam AI speech proxy (STT + TTS) — API key never exposed to frontend
app.use('/api/sarvam', sarvamRoutes_js_1.default);
// Process Voice Prompt endpoint
app.post('/api/process', async (req, res) => {
    try {
        const { prompt, history } = req.body;
        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }
        const chatHistory = history || [];
        const result = await (0, llmService_js_1.processSpeechInput)(prompt, chatHistory);
        res.json(result);
    }
    catch (error) {
        console.error('[Server Error] Failed to process voice input:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message || 'Unknown error occurred',
        });
    }
});
// System health check
app.get('/api/status', (req, res) => {
    const hasKey = !!process.env.OPENAI_API_KEY;
    res.json({
        status: 'online',
        engine: hasKey ? 'OpenAI-Compatible LLM' : 'Local NLP Fallback Engine',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        endpoint: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        apiKeyConfigured: hasKey,
        timestamp: new Date().toISOString(),
    });
});
app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(` Nova Voice Assistant Backend is active on PORT ${PORT}`);
    console.log(` Status: http://localhost:${PORT}/api/status`);
    console.log(` Process Endpoint: http://localhost:${PORT}/api/process`);
    console.log(`==================================================`);
});
