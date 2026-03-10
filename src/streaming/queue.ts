/**
 * Per-channel message queue to prevent concurrent Discord edits.
 * Ensures only one streaming response happens per channel at a time.
 */
export class ChannelQueue {
  private locks = new Map<string, Promise<void>>();

  /**
   * Run a function with exclusive access to a channel.
   * Queues behind any existing operation on the same channel.
   */
  async run<T>(channelId: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(channelId) ?? Promise.resolve();

    let resolve!: () => void;
    const current = new Promise<void>((r) => { resolve = r; });
    this.locks.set(channelId, current);

    // Wait for previous operation to complete
    await prev;

    try {
      return await fn();
    } finally {
      resolve();
      // Clean up if we're still the last in queue
      if (this.locks.get(channelId) === current) {
        this.locks.delete(channelId);
      }
    }
  }

  /** Number of channels with active/queued operations */
  get size(): number {
    return this.locks.size;
  }
}
