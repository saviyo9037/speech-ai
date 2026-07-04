import { TTSEngine } from './TTSEngine';

export class BrowserTTS implements TTSEngine {
  private synth: SpeechSynthesis;
  private voiceName: string = '';
  private rate: number = 1.0;
  private pitch: number = 1.0;
  private volume: number = 1.0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private activeSpeakResolve: (() => void) | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  public async speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      // Cancel active speech before starting a new one
      this.stop();

      if (!text || text.trim() === '') {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      this.activeSpeakResolve = resolve;

      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.volume = this.volume;

      const voices = this.synth.getVoices();
      const voice = voices.find((v) => v.name === this.voiceName);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
          this.activeSpeakResolve = null;
        }
        resolve();
      };

      utterance.onerror = (e) => {
        console.error('[BrowserTTS] error speaking:', e);
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
          this.activeSpeakResolve = null;
        }
        resolve(); // Resolve to prevent freezing queue execution
      };

      this.synth.speak(utterance);
    });
  }

  public pause(): void {
    this.synth.pause();
  }

  public resume(): void {
    this.synth.resume();
  }

  public stop(): void {
    this.synth.cancel();
    if (this.activeSpeakResolve) {
      this.activeSpeakResolve();
      this.activeSpeakResolve = null;
    }
    this.currentUtterance = null;
  }

  public async getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = this.synth.getVoices();
      if (voices.length > 0) {
        resolve(voices);
        return;
      }
      this.synth.onvoiceschanged = () => {
        voices = this.synth.getVoices();
        resolve(voices);
      };
    });
  }

  public setVoice(voiceName: string): void {
    this.voiceName = voiceName;
  }

  public setRate(rate: number): void {
    this.rate = rate;
  }

  public setPitch(pitch: number): void {
    this.pitch = pitch;
  }

  public setVolume(volume: number): void {
    this.volume = volume;
  }

  public destroy(): void {
    this.stop();
  }
}
