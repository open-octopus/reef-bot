import { createConsola } from "consola";

const log = createConsola({ defaults: { tag: "scheduler" } });

const INTERVALS = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
} as const;

interface ScheduledTask {
  name: string;
  interval: "weekly" | "monthly";
  callback: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
}

/**
 * Simple interval-based scheduler for recurring bot tasks.
 * Runs each callback immediately on start, then repeats at the configured interval.
 */
export class Scheduler {
  private tasks: ScheduledTask[] = [];

  /** Register a recurring task. */
  register(name: string, interval: "weekly" | "monthly", callback: () => Promise<void>): void {
    this.tasks.push({ name, interval, callback });
    log.info(`Registered scheduled task: ${name} (${interval})`);
  }

  /** Start all registered tasks. Runs each callback immediately, then at the interval. */
  start(): void {
    for (const task of this.tasks) {
      // Run immediately for testing convenience
      void task.callback().catch((err) => {
        log.error(`Scheduled task "${task.name}" failed: ${err instanceof Error ? err.message : String(err)}`);
      });

      // Schedule recurring execution
      task.timer = setInterval(() => {
        void task.callback().catch((err) => {
          log.error(`Scheduled task "${task.name}" failed: ${err instanceof Error ? err.message : String(err)}`);
        });
      }, INTERVALS[task.interval]);

      log.info(`Started scheduled task: ${task.name} (every ${task.interval})`);
    }
  }

  /** Stop all scheduled tasks and clear timers. */
  stop(): void {
    for (const task of this.tasks) {
      if (task.timer) {
        clearInterval(task.timer);
        task.timer = undefined;
      }
    }
    log.info(`Stopped ${this.tasks.length} scheduled task(s)`);
  }
}
