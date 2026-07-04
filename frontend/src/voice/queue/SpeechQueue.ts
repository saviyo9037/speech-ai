import { TTSEngine } from '../tts/TTSEngine';

export class SpeechQueue {
  private queue: string[] = [];
  private ttsEngine: TTSEngine;
  private speaking: boolean = false;
  private onSpeechStart: ((text: string) => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;

  constructor(ttsEngine: TTSEngine) {
    this.ttsEngine = ttsEngine;
  }

  public enqueue(text: string): void {
    if (!text || text.trim() === '') return;
    this.queue.push(text);
    this.processNext();
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getQueue(): string[] {
    return [...this.queue];
  }

  public clear(): void {
    this.queue = [];
    this.speaking = false;
    this.ttsEngine.stop();
  }

  public subscribe(events: {
    onSpeechStart?: (text: string) => void;
    onSpeechEnd?: () => void;
  }) {
    if (events.onSpeechStart) this.onSpeechStart = events.onSpeechStart;
    if (events.onSpeechEnd) this.onSpeechEnd = events.onSpeechEnd;
  }

  private async processNext(): Promise<void> {
    if (this.speaking || this.queue.length === 0) {
      if (this.queue.length === 0 && !this.speaking) {
        this.onSpeechEnd?.();
      }
      return;
    }

    this.speaking = true;
    const currentText = this.queue[0];
    this.onSpeechStart?.(currentText);

    try {
      console.log(`[SpeechQueue] Speaking: "${currentText}"`);
      await this.ttsEngine.speak(currentText);
    } catch (e) {
      console.error('[SpeechQueue] speak error:', e);
    } finally {
      this.queue.shift();
      this.speaking = false;
      this.processNext();
    }
  }
}
