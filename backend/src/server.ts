import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processSpeechInput } from './services/llmService.js';
import sarvamRoutes from './routes/sarvamRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(cors({
  origin: '*', // In production, replace with specific frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Sarvam AI speech proxy (STT + TTS) — API key never exposed to frontend
app.use('/api/sarvam', sarvamRoutes);

// Process Voice Prompt endpoint
app.post('/api/process', async (req: Request, res: Response) => {
  try {
    const { prompt, history } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const chatHistory = history || [];
    const result = await processSpeechInput(prompt, chatHistory);

    res.json(result);
  } catch (error: any) {
    console.error('[Server Error] Failed to process voice input:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Unknown error occurred',
    });
  }
});

// System health check
app.get('/api/status', (req: Request, res: Response) => {
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
