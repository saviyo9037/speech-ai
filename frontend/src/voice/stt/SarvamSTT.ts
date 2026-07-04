/**
 * SarvamSTT.ts
 * Implements the STTEngine interface using Sarvam AI's Speech-to-Text API.
 *
 * Flow:
 *   1. getUserMedia()          → open microphone stream
 *   2. AudioContext AnalyserNode → Voice Activity Detection (VAD)
 *   3. MediaRecorder            → collect audio chunks while user speaks
 *   4. 1.5s silence detected   → stop recording, send audio blob to backend
 *   5. Backend /api/sarvam/stt → Sarvam AI → transcript string
 *   6. Fire onResult callback  → VoiceManager processes the transcript (unchanged)
 *   7. Auto-restart listening cycle
 *
 * Fallback: If the Sarvam backend returns { fallback: true } or throws any error,
 *           this engine automatically switches to BrowserSTT.
 */

import { STTEngine, STTCallbackData } from '../types';
import { BrowserSTT } from './BrowserSTT';

// ---- Configuration -----------------------------------------------------------

const BACKEND_URL   = import.meta.env.VITE_SARVAM_BACKEND_URL || 'http://localhost:5000';
const LANG_CODE     = import.meta.env.VITE_SARVAM_LANGUAGE    || 'en-IN';

/** RMS audio level (0–1) below which audio is considered silence. */
const SILENCE_THRESHOLD = 0.01;

/** How long (ms) the audio must stay below threshold before we send the recording. */
const SILENCE_DURATION_MS = 1500;

/** Minimum speech duration (ms) — avoids sending empty/tiny recordings. */
const MIN_SPEECH_MS = 500;

/** Interval (ms) at which we check the audio level via AnalyserNode. */
const VAD_POLL_MS = 80;

/**
 * Maximum recording duration in ms before we force-send, regardless of silence.
 * Sarvam STT API limit is ~30s / ~4MB per request.
 * We cap at 15s (≈600KB webm) to stay well within limits.
 */
const MAX_RECORDING_MS = 15_000;

/** Maximum audio blob size in bytes before we reject and skip the request. */
const MAX_BLOB_BYTES = 3.5 * 1024 * 1024; // 3.5 MB

// ---- SarvamSTT ---------------------------------------------------------------

export class SarvamSTT implements STTEngine {
  // ---- Private state ---------------------------------------------------------
  private stream:        MediaStream | null = null;
  private audioContext:  AudioContext | null = null;
  private analyser:      AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks:   Blob[] = [];

  private _isListening:  boolean = false;
  private isSpeaking:    boolean = false;
  private shouldRestart: boolean = false;

  private speechStartTime:  number = 0;
  private silenceStartTime: number = 0;
  private vadTimer:            ReturnType<typeof setInterval> | null = null;
  private maxDurationTimer:    ReturnType<typeof setTimeout>  | null = null;

  private language: string = LANG_CODE;

  // ---- Callbacks (matches STTEngine interface) --------------------------------
  private resultCallback: ((data: STTCallbackData) => void) | null = null;
  private errorCallback:  ((error: string) => void) | null = null;
  private statusCallback: ((status: 'idle' | 'listening' | 'processing') => void) | null = null;

  // ---- Fallback engine -------------------------------------------------------
  private fallback:    BrowserSTT | null = null;
  private usingFallback: boolean = false;

  // ---- STTEngine: start() ----------------------------------------------------

  public start(): void {
    if (this._isListening) return;

    this.shouldRestart = true;
    this._isListening  = true;
    this.statusCallback?.('listening');

    console.log('[SarvamSTT] Starting microphone session...');
    this.openMicrophone();
  }

  // ---- STTEngine: stop() -----------------------------------------------------

  public stop(): void {
    this.shouldRestart = false;
    this._isListening  = false;

    if (this.usingFallback && this.fallback) {
      this.fallback.stop();
      return;
    }

    this.cleanupSession();
    this.statusCallback?.('idle');
    console.log('[SarvamSTT] Stopped.');
  }

  // ---- STTEngine: isListening() ----------------------------------------------

  public isListening(): boolean {
    return this._isListening;
  }

  // ---- STTEngine: callbacks --------------------------------------------------

  public onResult(callback: (data: STTCallbackData) => void): void {
    this.resultCallback = callback;
    this.fallback?.onResult(callback);
  }

  public onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
    this.fallback?.onError(callback);
  }

  public onStatusChange(callback: (status: 'idle' | 'listening' | 'processing') => void): void {
    this.statusCallback = callback;
    this.fallback?.onStatusChange(callback);
  }

  public setLanguage(lang: string): void {
    this.language = lang;
    if (this.usingFallback && this.fallback) {
      this.fallback.setLanguage(lang);
    }
  }

  public destroy(): void {
    this.stop();
    this.cleanupSession();
    this.fallback?.destroy();
    this.resultCallback = null;
    this.errorCallback  = null;
    this.statusCallback = null;
  }

  // ---- Private: Microphone + VAD  -------------------------------------------

  private async openMicrophone(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      // Build Web Audio pipeline for Voice Activity Detection
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      const source      = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser     = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);

      console.log('[SarvamSTT] Microphone opened. Starting VAD loop.');
      this.startVAD();

    } catch (err: any) {
      console.error('[SarvamSTT] Microphone access failed:', err.message);
      this.errorCallback?.(`Microphone error: ${err.message}`);
      this.activateFallback();
    }
  }

  /**
   * Voice Activity Detection — polls the AnalyserNode every VAD_POLL_MS ms.
   * Speech start  → begin MediaRecorder session.
   * 1.5s silence after speech → stop recorder and send audio.
   */
  private startVAD(): void {
    if (!this.analyser) return;

    const dataArray = new Float32Array(this.analyser.fftSize);

    this.vadTimer = setInterval(() => {
      if (!this.analyser || !this._isListening) return;

      this.analyser.getFloatTimeDomainData(dataArray);

      // Compute RMS (Root Mean Square) of the audio samples
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sumSquares += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      const hasSpeech = rms > SILENCE_THRESHOLD;
      const now       = Date.now();

      if (hasSpeech) {
        // ---- Speech detected ------------------------------------------------
        if (!this.isSpeaking) {
          // Speech just started
          this.isSpeaking     = true;
          this.speechStartTime = now;
          this.silenceStartTime = 0;
          console.log('[SarvamSTT] Speech start detected (RMS:', rms.toFixed(4), ')');
          this.startRecording();
        }
        // Reset silence timer while speech continues
        this.silenceStartTime = 0;
      } else {
        // ---- Silence detected -----------------------------------------------
        if (this.isSpeaking) {
          if (this.silenceStartTime === 0) {
            this.silenceStartTime = now;
          }
          const silenceDuration = now - this.silenceStartTime;

          if (silenceDuration >= SILENCE_DURATION_MS) {
            // Enough silence — user stopped speaking
            this.isSpeaking = false;
            console.log('[SarvamSTT] Silence detected — finalising recording.');
            this.stopRecordingAndTranscribe();
          }
        }
      }
    }, VAD_POLL_MS);
  }

  /** Begin collecting audio chunks into a MediaRecorder. */
  private startRecording(): void {
    if (!this.stream) return;
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') return;

    this.audioChunks = [];

    // Pick a format the browser supports
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    this.mediaRecorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : {});

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(250); // collect chunks every 250ms
    console.log('[SarvamSTT] MediaRecorder started, mimeType:', mimeType || 'browser default');

    // Safety cap — if user speaks for longer than MAX_RECORDING_MS, force-send.
    // This prevents oversized blobs that exceed Sarvam's API limits.
    this.maxDurationTimer = setTimeout(() => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        console.warn(`[SarvamSTT] Max duration (${MAX_RECORDING_MS / 1000}s) reached — force-finalising.`);
        this.isSpeaking = false;
        this.stopRecordingAndTranscribe();
      }
    }, MAX_RECORDING_MS);
  }

  /** Stop the recorder and send the collected audio to the Sarvam backend. */
  private stopRecordingAndTranscribe(): void {
    // Clear max-duration safety timer
    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      if (this.shouldRestart) this.restartListening();
      return;
    }

    const speechDuration = Date.now() - this.speechStartTime;
    if (speechDuration < MIN_SPEECH_MS) {
      console.log('[SarvamSTT] Recording too short, ignoring.');
      this.mediaRecorder.stop();
      if (this.shouldRestart) this.restartListening();
      return;
    }

    this.statusCallback?.('processing');

    this.mediaRecorder.onstop = async () => {
      const mimeType   = this.audioChunks[0]?.type || 'audio/webm';
      const audioBlob  = new Blob(this.audioChunks, { type: mimeType });
      const extension  = mimeType.includes('webm') ? 'webm' : 'wav';
      const filename   = `audio.${extension}`;

      console.log(`[SarvamSTT] Audio ready: ${(audioBlob.size / 1024).toFixed(1)} KB, type: ${mimeType}`);

      // Guard — reject blobs that are too large for Sarvam's API
      if (audioBlob.size > MAX_BLOB_BYTES) {
        console.warn(
          `[SarvamSTT] Blob too large (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB > 3.5 MB limit). Skipping.`
        );
        this.statusCallback?.('listening');
        if (this.shouldRestart) this.restartListening();
        return;
      }

      try {
        const transcript = await this.sendToBackend(audioBlob, filename);

        if (transcript && transcript.trim()) {
          console.log(`[SarvamSTT] Final transcript: "${transcript}"`);
          this.resultCallback?.({
            transcript: transcript.trim(),
            isFinal:    true,
            confidence: 0.95,
          });
        } else {
          console.log('[SarvamSTT] Empty transcript, ignoring.');
        }
      } catch (err: any) {
        console.error('[SarvamSTT] Transcription failed:', err.message);

        // If the error signals to use fallback, activate it
        if (err.fallback) {
          this.activateFallback();
          return;
        }

        // Non-fatal — log and continue listening
        this.errorCallback?.(`STT error: ${err.message}`);
      } finally {
        this.statusCallback?.('listening');
        if (this.shouldRestart) this.restartListening();
      }
    };

    this.mediaRecorder.stop();
  }

  /**
   * POSTs the audio blob to the backend Sarvam STT proxy.
   * Returns the transcript string.
   */
  private async sendToBackend(audioBlob: Blob, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, filename);
    formData.append('language_code', this.language === 'en-US' ? 'unknown' : this.language);

    const response = await fetch(`${BACKEND_URL}/api/sarvam/stt`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (data.fallback) {
      const err: any = new Error(data.error || 'Sarvam STT unavailable');
      err.fallback = true;
      throw err;
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data.transcript || '';
  }

  /** Restart the VAD listening cycle after a transcription. */
  private restartListening(): void {
    // The stream + analyser stay open; just reset recording state
    this.audioChunks   = [];
    this.mediaRecorder = null;
    this.statusCallback?.('listening');
  }

  /** Tear down the microphone and audio pipeline. */
  private cleanupSession(): void {
    if (this.vadTimer !== null) {
      clearInterval(this.vadTimer);
      this.vadTimer = null;
    }

    if (this.maxDurationTimer !== null) {
      clearTimeout(this.maxDurationTimer);
      this.maxDurationTimer = null;
    }

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (_) { /* ignore */ }

    this.audioChunks   = [];
    this.mediaRecorder = null;
    this.isSpeaking    = false;

    try { this.analyser?.disconnect(); }   catch (_) { /* ignore */ }
    try { this.audioContext?.close(); }    catch (_) { /* ignore */ }
    try {
      this.stream?.getTracks().forEach(t => t.stop());
    } catch (_) { /* ignore */ }

    this.analyser     = null;
    this.audioContext = null;
    this.stream       = null;
  }

  // ---- Fallback: activate BrowserSTT -----------------------------------------

  private activateFallback(): void {
    if (this.usingFallback) return; // already using fallback

    console.warn('[SarvamSTT] Activating BrowserSTT fallback...');
    this.usingFallback = true;

    // Clean up Sarvam pipeline
    this.cleanupSession();

    // Instantiate and wire up BrowserSTT
    this.fallback = new BrowserSTT();
    if (this.resultCallback) this.fallback.onResult(this.resultCallback);
    if (this.errorCallback)  this.fallback.onError(this.errorCallback);
    if (this.statusCallback) this.fallback.onStatusChange(this.statusCallback);
    this.fallback.setLanguage(this.language);

    this.errorCallback?.(
      'Sarvam STT unavailable — using Browser Speech Recognition as fallback.'
    );

    if (this.shouldRestart) {
      this.fallback.start();
    }
  }
}
