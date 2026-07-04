export interface ActionTask {
  id: string;
  name: string;
  execute: () => Promise<any>;
}

export class ActionQueue {
  private queue: ActionTask[] = [];
  private processing: boolean = false;
  private onTaskStart: ((task: ActionTask) => void) | null = null;
  private onTaskComplete: ((task: ActionTask, result: any) => void) | null = null;
  private onQueueEmpty: (() => void) | null = null;

  public enqueue(name: string, execute: () => Promise<any>): void {
    const task: ActionTask = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      execute,
    };
    this.queue.push(task);
    this.processNext();
  }

  public getQueue(): ActionTask[] {
    return [...this.queue];
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  public clear(): void {
    this.queue = [];
    this.processing = false;
  }

  public subscribe(events: {
    onTaskStart?: (task: ActionTask) => void;
    onTaskComplete?: (task: ActionTask, result: any) => void;
    onQueueEmpty?: () => void;
  }) {
    if (events.onTaskStart) this.onTaskStart = events.onTaskStart;
    if (events.onTaskComplete) this.onTaskComplete = events.onTaskComplete;
    if (events.onQueueEmpty) this.onQueueEmpty = events.onQueueEmpty;
  }

  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      if (this.queue.length === 0 && !this.processing) {
        this.onQueueEmpty?.();
      }
      return;
    }

    this.processing = true;
    const currentTask = this.queue[0];
    this.onTaskStart?.(currentTask);

    try {
      console.log(`[ActionQueue] Running task: ${currentTask.name}`);
      const result = await currentTask.execute();
      this.onTaskComplete?.(currentTask, result);
    } catch (e) {
      console.error(`[ActionQueue] Task ${currentTask.name} failed:`, e);
      this.onTaskComplete?.(currentTask, { success: false, error: e });
    } finally {
      this.queue.shift();
      this.processing = false;
      this.processNext();
    }
  }
}
