/**
 * SpeechEngineFactory.ts
 * Factory that selects the correct STT and TTS engine based on configuration.
 *
 * Decision logic:
 *   VITE_USE_SARVAM=true  → SarvamSTT + SarvamTTS   (with auto-fallback)
 *   VITE_USE_SARVAM=false → BrowserSTT + BrowserTTS  (original behaviour)
 *
 * Usage (in VoiceManager constructor or VoiceContext):
 *
 *   const stt = SpeechEngineFactory.createSTT();
 *   const tts = SpeechEngineFactory.createTTS();
 *   const manager = new VoiceManager(stt, tts);
 */

import { STTEngine, TTSEngine } from '../types';
import { BrowserSTT } from '../stt/BrowserSTT';
import { BrowserTTS } from '../tts/BrowserTTS';
import { SarvamSTT }  from '../stt/SarvamSTT';
import { SarvamTTS }  from '../tts/SarvamTTS';

// Read once at module load — avoids repeated import.meta.env access
const USE_SARVAM = import.meta.env.VITE_USE_SARVAM === 'true';

export class SpeechEngineFactory {
  /**
   * Creates and returns an STT engine.
   * - If VITE_USE_SARVAM=true → SarvamSTT (auto-falls back to BrowserSTT on error)
   * - Otherwise → BrowserSTT
   */
  static createSTT(): STTEngine {
    if (USE_SARVAM) {
      console.log('[SpeechEngineFactory] STT → SarvamSTT (with BrowserSTT fallback)');
      return new SarvamSTT();
    }
    console.log('[SpeechEngineFactory] STT → BrowserSTT');
    return new BrowserSTT();
  }

  /**
   * Creates and returns a TTS engine.
   * - If VITE_USE_SARVAM=true → SarvamTTS (auto-falls back to BrowserTTS on error)
   * - Otherwise → BrowserTTS
   */
  static createTTS(): TTSEngine {
    if (USE_SARVAM) {
      console.log('[SpeechEngineFactory] TTS → SarvamTTS (with BrowserTTS fallback)');
      return new SarvamTTS();
    }
    console.log('[SpeechEngineFactory] TTS → BrowserTTS');
    return new BrowserTTS();
  }

  /**
   * Convenience — returns the active engine label for display in the UI or logs.
   */
  static getEngineLabel(): string {
    return USE_SARVAM ? 'Sarvam AI' : 'Browser Web Speech API';
  }
}
