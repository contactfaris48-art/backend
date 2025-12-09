import { QueueTask } from '../types';
import { config } from '../config';

export class AsyncQueue {
  private queue: QueueTask[];
  private workers: number;
  private activeWorkers: number;
  private processTask: (userId: number) => Promise<any>;

  constructor(
    processTask: (userId: number) => Promise<any>,
    concurrency: number = config.queue.concurrency
  ) {
    this.queue = [];
    this.workers = concurrency;
    this.activeWorkers = 0;
    this.processTask = processTask;
  }

  enqueue(userId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const task: QueueTask = {
        userId,
        resolve,
        reject,
      };

      this.queue.push(task);
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.activeWorkers >= this.workers || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeWorkers++;

    try {
      await this.delay(config.queue.dbDelay);
      const result = await this.processTask(task.userId);
      task.resolve(result);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeWorkers--;
      this.process();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getActiveWorkers(): number {
    return this.activeWorkers;
  }
}
