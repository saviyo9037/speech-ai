/**
 * SarvamTTS.ts
 * Implements the TTSEngine interface using Sarvam AI's Text-to-Speech API.
 *
 * Flow:
 *   1. speak(text) called by SpeechQueue (unchanged)
 *   2. POST /api/sarvam/tts → Backend → Sarvam AI
 *   3. Receive base64-encoded WAV audio
 *   4. Decode → AudioBuffer → play via Web Audio API
 *   5. Resolve Promise when playback completes → SpeechQueue continues
 *
 * Fallback: If the backend returns { fallback: true } or any request fails,
 *           automatically delegates to BrowserTTS for that utterance.
 *
 * Voice settings (rate, pitch, volume) are mapped to Sarvam's pace/loudness.
 * setVoice() maps speaker names to Sarvam speaker IDs.
 */

import { TTSEngine } from '../types';
import { BrowserTTS } from './BrowserTTS';

// ---- Configuration -----------------------------------------------------------

const BACKEND_URL = import.meta.env.VITE_SARVAM_BACKEND_URL || 'http://localhost:5000';
const LANG_CODE   = import.meta.env.VITE_SARVAM_LANGUAGE    || 'en-IN';
const SPEAKER_ID  = import.meta.env.VITE_SARVAM_SPEAKER     || 'meera';

/** Available Sarvam TTS speaker IDs. */
const SARVAM_SPEAKERS = [
  'meera', 'pavithra', 'maitreyi', 'arvind', 'amol',
  'amartya', 'diya', 'neel', 'misha', 'vian', 'arjun', 'maya',
] as const;

type SarvamSpeaker = (typeof SARVAM_SPEAKERS)[number];

// ---- SarvamTTS ---------------------------------------------------------------

export class SarvamTTS implements TTSEngine {
  // ---- Voice settings --------------------------------------------------------
  private speaker:     SarvamSpeaker = SPEAKER_ID as SarvamSpeaker;
  private languageCode: string       = LANG_CODE;
  private rate:        number        = 1.0;  // maps to Sarvam 'pace'
  private volume:      number        = 1.0;  // maps to Sarvam 'loudness' (normalised)
  // pitch is not exposed in Sarvam API — accepted but not forwarded

  // ---- Web Audio state -------------------------------------------------------
  private audioContext: AudioContext | null        = null;
  private sourceNode:   AudioBufferSourceNode | null = null;

  /** Resolve function of the active speak() Promise — called on end/stop. */
  private activeResolve: (() => void) | null = null;

  // ---- Fallback engine -------------------------------------------------------
  private fallback:      BrowserTTS = new BrowserTTS();
  private usingFallback: boolean    = false;

  // ---- TTSEngine: speak() ----------------------------------------------------

  public async speak(text: string): Promise<void> {
    if (!text || !text.trim()) return;

    // Stop any currently playing audio
    this.stop();

    if (this.usingFallback) {
      console.log('[SarvamTTS] Using BrowserTTS fallback for:', text.slice(0, 40));
      return this.fallback.speak(text);
    }

    return new Promise<void>(async (resolve) => {
      this.activeResolve = resolve;

      try {
        console.log(`[SarvamTTS] Requesting TTS for: "${text.slice(0, 60)}..."`);

        // Map rate (0.5–2.0) → Sarvam pace (0.5–2.0) directly
        const pace = Math.max(0.5, Math.min(2.0, this.rate));

        // Map volume (0–1) → Sarvam loudness (0.5–2.0)
        const loudness = Math.max(0.5, Math.min(2.0, this.volume * 2.0));

        const response = await fetch(`${BACKEND_URL}/api/sarvam/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language_code: this.languageCode,
            speaker:       this.speaker,
            pace,
            loudness,
          }),
        });

        const data = await response.json();

        if (data.fallback || !response.ok) {
          console.warn('[SarvamTTS] Backend signalled fallback:', data.error);
          this.activateFallback();
          await this.fallback.speak(text);
          resolve();
          return;
        }

        const base64Audio: string = data.audio;
        if (!base64Audio) {
          throw new Error('Empty audio response from backend.');
        }

        // Decode base64 WAV → ArrayBuffer → AudioBuffer → play
        await this.playBase64Audio(base64Audio);

      } catch (err: any) {
        console.error('[SarvamTTS] Error, falling back to BrowserTTS:', err.message);
        this.activateFallback();

        try {
          await this.fallback.speak(text);
        } catch (_) { /* silent */ }

        resolve();
        return;
      }

      // Resolve is called in onended callback inside playBase64Audio
    });
  }

  // ---- TTSEngine: pause() / resume() / stop() --------------------------------

  public pause(): void {
    if (this.usingFallback) { this.fallback.pause(); return; }
    // Web Audio API doesn't support native pause — suspend the context
    this.audioContext?.suspend();
  }

  public resume(): void {
    if (this.usingFallback) { this.fallback.resume(); return; }
    this.audioContext?.resume();
  }

  public stop(): void {
    if (this.usingFallback) { this.fallback.stop(); return; }

    try {
      this.sourceNode?.stop();
      this.sourceNode?.disconnect();
    } catch (_) { /* ignore — may already be stopped */ }

    this.sourceNode = null;

    // Resolve any pending speak() Promise so SpeechQueue is unblocked
    if (this.activeResolve) {
      this.activeResolve();
      this.activeResolve = null;
    }
  }

  // ---- TTSEngine: getVoices() -------------------------------------------------

  /**
   * Returns a mock list of SpeechSynthesisVoice-shaped objects for the Sarvam speakers.
   * VoiceManager uses this list to populate the voice picker UI.
   */
  public async getVoices(): Promise<SpeechSynthesisVoice[]> {
    // Merge Sarvam speakers into the existing browser voices list
    // so the UI selector still works
    const browserVoices = await this.fallback.getVoices();

    const sarvamVoices = SARVAM_SPEAKERS.map((speaker) => ({
      default:     speaker === 'meera',
      lang:        this.languageCode,
      localService: false,
      name:        `Sarvam — ${speaker.charAt(0).toUpperCase()}${speaker.slice(1)}`,
      voiceURI:    `sarvam:${speaker}`,
    } as SpeechSynthesisVoice));

    return [...sarvamVoices, ...browserVoices];
  }

  // ---- TTSEngine: setters ----------------------------------------------------

  /**
   * Accepts either a Sarvam speaker ID directly (e.g. 'meera')
   * or a Sarvam UI name (e.g. 'Sarvam — Meera').
   * Falls back to the default speaker if unrecognised.
   */
  public setVoice(voiceName: string): void {
    // Strip the 'Sarvam — ' prefix if present
    const normalized = voiceName.replace(/^Sarvam — /i, '').toLowerCase();

    if ((SARVAM_SPEAKERS as readonly string[]).includes(normalized)) {
      this.speaker = normalized as SarvamSpeaker;
      console.log(`[SarvamTTS] Speaker set to: ${this.speaker}`);
    } else {
      // Pass through to BrowserTTS for browser-native voices
      this.fallback.setVoice(voiceName);
      console.log(`[SarvamTTS] Unknown speaker "${voiceName}" — delegating to BrowserTTS.`);
    }
  }

  public setRate(rate: number): void {
    this.rate = rate;
    this.fallback.setRate(rate);
  }

  public setPitch(pitch: number): void {
    // Sarvam TTS does not expose pitch control — forward to fallback only
    this.fallback.setPitch(pitch);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    this.fallback.setVolume(volume);
  }

  // ---- TTSEngine: destroy() --------------------------------------------------

  public destroy(): void {
    this.stop();
    try { this.audioContext?.close(); } catch (_) { /* ignore */ }
    this.audioContext = null;
    this.fallback.destroy();
    this.activeResolve = null;
  }

  // ---- Private: Web Audio playback ------------------------------------------

  /**
   * Decodes a base64 WAV string and plays it through the Web Audio API.
   * Resolves the outer speak() Promise via activeResolve when playback ends.
   */
  private async playBase64Audio(base64: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Decode base64 → binary
        const binary     = atob(base64);
        const byteArray  = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          byteArray[i] = binary.charCodeAt(i);
        }
        const arrayBuffer = byteArray.buffer;

        // Reuse or create AudioContext
        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioContext();
        }
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);

        // Apply volume via GainNode
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = Math.max(0, Math.min(1, this.volume));
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.disconnect(this.audioContext.destination); // reconnect through gain only

        this.sourceNode = source;

        source.onended = () => {
          this.sourceNode   = null;
          this.activeResolve = null;
          resolve();
        };

        source.start(0);
        console.log('[SarvamTTS] Playback started.');

      } catch (err) {
        reject(err);
      }
    });
  }

  // ---- Fallback: activate BrowserTTS -----------------------------------------

  private activateFallback(): void {
    if (this.usingFallback) return;

    console.warn('[SarvamTTS] Switching to BrowserTTS fallback permanently for this session.');
    this.usingFallback = true;
  }
}
