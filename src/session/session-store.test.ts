import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SessionStore } from "./session-store.js";

describe("SessionStore", () => {
  it("creates and retrieves sessions", () => {
    const store = new SessionStore();
    const id = store.getOrCreate("dm:user1", "user1", "ch1");
    expect(id).toMatch(/^sess_/);

    // Same key returns same session
    const id2 = store.getOrCreate("dm:user1", "user1", "ch1");
    expect(id2).toBe(id);
  });

  it("creates different sessions for different keys", () => {
    const store = new SessionStore();
    const id1 = store.getOrCreate("dm:user1", "user1", "ch1");
    const id2 = store.getOrCreate("dm:user2", "user2", "ch2");
    expect(id1).not.toBe(id2);
  });

  it("expires old sessions", () => {
    const store = new SessionStore(100); // 100ms TTL
    const id1 = store.getOrCreate("dm:user1", "user1", "ch1");

    vi.useFakeTimers();
    vi.advanceTimersByTime(200);

    const id2 = store.getOrCreate("dm:user1", "user1", "ch1");
    expect(id2).not.toBe(id1);

    vi.useRealTimers();
  });

  it("prunes expired sessions", () => {
    const store = new SessionStore(100);
    store.getOrCreate("dm:user1", "user1", "ch1");
    store.getOrCreate("dm:user2", "user2", "ch2");

    vi.useFakeTimers();
    vi.advanceTimersByTime(200);

    const pruned = store.prune();
    expect(pruned).toBe(2);
    expect(store.size).toBe(0);

    vi.useRealTimers();
  });

  it("builds correct keys", () => {
    expect(SessionStore.key({ isDM: true, channelId: "ch1", userId: "u1" })).toBe("dm:u1");
    expect(SessionStore.key({ isDM: false, channelId: "ch1", userId: "u1" })).toBe("ch:ch1:u1");
    expect(SessionStore.key({ isDM: false, channelId: "ch1", userId: "u1", threadId: "t1" })).toBe("th:t1:u1");
  });

  it("deletes sessions", () => {
    const store = new SessionStore();
    store.getOrCreate("dm:user1", "user1", "ch1");
    expect(store.size).toBe(1);

    store.delete("dm:user1");
    expect(store.size).toBe(0);
    expect(store.get("dm:user1")).toBeUndefined();
  });

  it("clears all sessions", () => {
    const store = new SessionStore();
    store.getOrCreate("dm:user1", "user1", "ch1");
    store.getOrCreate("dm:user2", "user2", "ch2");

    store.clear();
    expect(store.size).toBe(0);
  });
});
