import { describe, it, expect } from "vitest";
import { ChannelQueue } from "./queue.js";

describe("ChannelQueue", () => {
  it("run executes fn and returns result", async () => {
    const queue = new ChannelQueue();
    const result = await queue.run("ch1", async () => 42);
    expect(result).toBe(42);
  });

  it("same channel two concurrent runs execute sequentially", async () => {
    const queue = new ChannelQueue();
    const order: number[] = [];

    let resolveFirst!: () => void;
    const firstBlocked = new Promise<void>((r) => { resolveFirst = r; });

    const run1 = queue.run("ch1", async () => {
      order.push(1);
      await firstBlocked;
      order.push(2);
    });

    const run2 = queue.run("ch1", async () => {
      order.push(3);
    });

    // run2 should not have started yet because run1 is still blocked
    // Give microtasks a chance to settle
    await Promise.resolve();
    expect(order).toEqual([1]);

    resolveFirst();
    await Promise.all([run1, run2]);

    expect(order).toEqual([1, 2, 3]);
  });

  it("different channels two concurrent runs execute in parallel", async () => {
    const queue = new ChannelQueue();
    const order: string[] = [];

    let resolveA!: () => void;
    const blockedA = new Promise<void>((r) => { resolveA = r; });

    let resolveB!: () => void;
    const blockedB = new Promise<void>((r) => { resolveB = r; });

    const runA = queue.run("ch1", async () => {
      order.push("a-start");
      await blockedA;
      order.push("a-end");
    });

    const runB = queue.run("ch2", async () => {
      order.push("b-start");
      await blockedB;
      order.push("b-end");
    });

    // Let microtasks settle - both should have started
    await Promise.resolve();
    await Promise.resolve();
    expect(order).toContain("a-start");
    expect(order).toContain("b-start");

    resolveA();
    resolveB();
    await Promise.all([runA, runB]);
  });

  it("size reflects active channel count", async () => {
    const queue = new ChannelQueue();
    expect(queue.size).toBe(0);

    let resolve1!: () => void;
    const blocked1 = new Promise<void>((r) => { resolve1 = r; });

    let resolve2!: () => void;
    const blocked2 = new Promise<void>((r) => { resolve2 = r; });

    const run1 = queue.run("ch1", async () => { await blocked1; });
    const run2 = queue.run("ch2", async () => { await blocked2; });

    // Let microtasks settle
    await Promise.resolve();
    expect(queue.size).toBe(2);

    resolve1();
    await run1;
    expect(queue.size).toBe(1);

    resolve2();
    await run2;
    expect(queue.size).toBe(0);
  });

  it("fn throws error propagates and does not leak lock", async () => {
    const queue = new ChannelQueue();

    await expect(
      queue.run("ch1", async () => { throw new Error("boom"); }),
    ).rejects.toThrow("boom");

    // Lock should be cleaned up - a new run on the same channel should work
    const result = await queue.run("ch1", async () => "recovered");
    expect(result).toBe("recovered");
    expect(queue.size).toBe(0);
  });
});
