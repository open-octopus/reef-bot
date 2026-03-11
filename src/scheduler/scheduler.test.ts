import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Scheduler } from "./scheduler.js";

const WEEKLY_MS = 7 * 24 * 60 * 60 * 1000;

describe("Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("register stores task but does not execute immediately", () => {
    const scheduler = new Scheduler();
    const cb = vi.fn(async () => {});

    scheduler.register("test-task", "weekly", cb);

    expect(cb).not.toHaveBeenCalled();
  });

  it("start immediately calls all registered callbacks", async () => {
    const scheduler = new Scheduler();
    const cb = vi.fn(async () => {});

    scheduler.register("test-task", "weekly", cb);
    scheduler.start();

    // Flush the microtask queue so the void promise from start() resolves
    await vi.advanceTimersByTimeAsync(0);

    expect(cb).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it("start then after interval passes calls again", async () => {
    const scheduler = new Scheduler();
    const cb = vi.fn(async () => {});

    scheduler.register("test-task", "weekly", cb);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(cb).toHaveBeenCalledTimes(1);

    // Advance by one weekly interval
    vi.advanceTimersByTime(WEEKLY_MS);
    await vi.advanceTimersByTimeAsync(0);

    expect(cb).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it("stop clears all timers", async () => {
    const scheduler = new Scheduler();
    const cb = vi.fn(async () => {});

    scheduler.register("test-task", "weekly", cb);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);
    expect(cb).toHaveBeenCalledTimes(1);

    scheduler.stop();

    // Advance time well past the interval - callback should not fire again
    vi.advanceTimersByTime(WEEKLY_MS * 3);
    await vi.advanceTimersByTimeAsync(0);

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("callback that throws does not crash scheduler", async () => {
    const scheduler = new Scheduler();
    const failingCb = vi.fn(async () => { throw new Error("task failed"); });
    const succeedingCb = vi.fn(async () => {});

    scheduler.register("failing-task", "weekly", failingCb);
    scheduler.register("good-task", "weekly", succeedingCb);
    scheduler.start();

    await vi.advanceTimersByTimeAsync(0);

    // Both callbacks were invoked despite the first one throwing
    expect(failingCb).toHaveBeenCalledTimes(1);
    expect(succeedingCb).toHaveBeenCalledTimes(1);

    // Subsequent intervals still work
    vi.advanceTimersByTime(WEEKLY_MS);
    await vi.advanceTimersByTimeAsync(0);

    expect(failingCb).toHaveBeenCalledTimes(2);
    expect(succeedingCb).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });
});
