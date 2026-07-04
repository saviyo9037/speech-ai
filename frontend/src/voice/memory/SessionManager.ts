export class SessionManager {
  private active: boolean = false;
  private timeoutId: any | null = null;
  private timeoutDuration: number = 10000; // 10 seconds of silence to deactivate
  private onDeactivateCallback: (() => void) | null = null;

  constructor(timeoutDurationMs?: number) {
    if (timeoutDurationMs) {
      this.timeoutDuration = timeoutDurationMs;
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public activate(): void {
    this.active = true;
    this.resetTimeout();
  }

  public deactivate(): void {
    this.active = false;
    this.clearTimeout();
    if (this.onDeactivateCallback) {
      this.onDeactivateCallback();
    }
  }

  public onDeactivate(callback: () => void): void {
    this.onDeactivateCallback = callback;
  }

  public resetTimeout(): void {
    this.clearTimeout();
    if (this.active) {
      this.timeoutId = setTimeout(() => {
        console.log('[SessionManager] Session expired due to inactivity.');
        this.deactivate();
      }, this.timeoutDuration);
    }
  }

  public clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Scans a speech transcript for wake words.
   * Returns true and sets active=true if found, along with the stripped transcript.
   */
  public checkWakeWord(
    transcript: string,
    wakeWord: string
  ): { detected: boolean; strippedText: string } {
    const text = transcript.toLowerCase().trim();
    const word = wakeWord.toLowerCase().trim();

    // Check if the user said the wake word
    if (text.includes(word)) {
      const idx = text.indexOf(word);
      const strippedText = transcript.substring(idx + wakeWord.length).trim();
      this.activate();
      return { detected: true, strippedText };
    }

    return { detected: false, strippedText: transcript };
  }
}
