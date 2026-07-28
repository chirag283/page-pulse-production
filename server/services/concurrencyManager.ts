import { logger } from '../utils/logger';

interface QueuedTask<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  enqueuedAt: number;
}

export class ConcurrencyManager {
  private activeCount = 0;
  private maxConcurrency: number;
  private maxQueueLength: number;
  private queue: QueuedTask<unknown>[] = [];
  private totalAuditsProcessed = 0;
  private totalWaitTimeMs = 0;

  constructor(
    maxConcurrency: number = Number(process.env.MAX_CONCURRENCY || 500),
    maxQueueLength: number = Number(process.env.MAX_QUEUE_LENGTH || 1000)
  ) {
    this.maxConcurrency = maxConcurrency;
    this.maxQueueLength = maxQueueLength;
  }

  /**
   * Executes a task within concurrency limits or enqueues it.
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount < this.maxConcurrency) {
      return this.runTask(fn);
    }

    if (this.queue.length >= this.maxQueueLength) {
      throw new Error(`CONCURRENCY_EXCEEDED: System concurrency queue is full (${this.queue.length}/${this.maxQueueLength}).`);
    }

    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
      };
      this.queue.push(task as QueuedTask<unknown>);
    });
  }

  private async runTask<T>(fn: () => Promise<T>): Promise<T> {
    this.activeCount++;
    try {
      const result = await fn();
      this.totalAuditsProcessed++;
      return result;
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private processNext() {
    if (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const nextTask = this.queue.shift();
      if (nextTask) {
        const waitTime = Date.now() - nextTask.enqueuedAt;
        this.totalWaitTimeMs += waitTime;

        this.runTask(nextTask.fn)
          .then(nextTask.resolve)
          .catch(nextTask.reject);
      }
    }
  }

  public getStats() {
    return {
      activeWorkers: this.activeCount,
      queuedRequests: this.queue.length,
      maxConcurrency: this.maxConcurrency,
      maxQueueLength: this.maxQueueLength,
      totalAuditsProcessed: this.totalAuditsProcessed,
      avgQueueWaitTimeMs:
        this.totalAuditsProcessed > 0
          ? Math.round(this.totalWaitTimeMs / this.totalAuditsProcessed)
          : 0,
    };
  }
}

export const concurrencyManager = new ConcurrencyManager();
