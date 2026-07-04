import { STTEngine, STTCallbackData } from './STTEngine';

export class BrowserSTT implements STTEngine {
  private recognition: any | null = null;
  private listening: boolean = false;
  private resultCallback: ((data: STTCallbackData) => void) | null = null;
  private errorCallback: ((error: string) => void) | null = null;
  private statusCallback: ((status: 'idle' | 'listening' | 'processing') => void) | null = null;
  private language: string = 'en-US';
  private shouldRestart: boolean = false;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.language;

    this.recognition.onstart = () => {
      this.listening = true;
      this.statusCallback?.('listening');
    };

    this.recognition.onend = () => {
      this.listening = false;
      this.statusCallback?.('idle');
      // Auto-restart if continuous mode is active
      if (this.shouldRestart) {
        try {
          this.recognition.start();
        } catch (e) {
          // Already running
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      let errorMessage = event.error;
      console.error('[BrowserSTT] error:', event.error);

      if (event.error === 'not-allowed') {
        errorMessage = 'Microphone permission denied.';
        this.shouldRestart = false;
      } else if (event.error === 'no-speech') {
        // No speech detected, not a fatal error, just silence.
        return;
      } else if (event.error === 'aborted') {
        // Aborted typically triggers when stopped manually
        return;
      }

      this.errorCallback?.(errorMessage);
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 1.0;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          confidence = result[0].confidence;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (this.resultCallback) {
        if (finalTranscript) {
          this.resultCallback({
            transcript: finalTranscript.trim(),
            isFinal: true,
            confidence,
          });
        } else if (interimTranscript) {
          this.resultCallback({
            transcript: interimTranscript.trim(),
            isFinal: false,
            confidence: 0.5,
          });
        }
      }
    };
  }

  public start(): void {
    if (!this.recognition) {
      this.errorCallback?.('SpeechRecognition not supported in this browser.');
      return;
    }
    this.shouldRestart = true;
    try {
      this.recognition.start();
    } catch (e) {
      // Already running
    }
  }

  public stop(): void {
    this.shouldRestart = false;
    if (!this.recognition) return;
    try {
      this.recognition.stop();
    } catch (e) {
      // Already stopped
    }
  }

  public isListening(): boolean {
    return this.listening;
  }

  public onResult(callback: (data: STTCallbackData) => void): void {
    this.resultCallback = callback;
  }

  public onError(callback: (error: string) => void): void {
    this.errorCallback = callback;
  }

  public onStatusChange(callback: (status: 'idle' | 'listening' | 'processing') => void): void {
    this.statusCallback = callback;
  }

  public setLanguage(lang: string): void {
    this.language = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
      if (this.listening) {
        // Restart recognition to apply the language change
        this.stop();
        setTimeout(() => {
          this.start();
        }, 300);
      }
    }
  }

  public destroy(): void {
    this.stop();
    this.resultCallback = null;
    this.errorCallback = null;
    this.statusCallback = null;
  }
}
