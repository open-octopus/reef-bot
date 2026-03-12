import { describe, it, expect, vi } from "vitest";
import { registerScheduledPosts } from "./scheduled-posts.js";

function createMockScheduler() {
  const jobs: Array<{ name: string; interval: string; fn: () => Promise<void> }> = [];
  return {
    register: vi.fn((name: string, interval: string, fn: () => Promise<void>) => {
      jobs.push({ name, interval, fn });
    }),
    jobs,
  };
}

function createMockClient() {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue({
        isTextBased: () => true,
        send: vi.fn(),
      }),
    },
  } as any;
}

describe("registerScheduledPosts", () => {
  it("skips registration when no announcementChannelId", () => {
    const scheduler = createMockScheduler();
    const client = createMockClient();
    const config = { announcementChannelId: "" } as any;

    registerScheduledPosts(scheduler as any, client, config);

    expect(scheduler.register).not.toHaveBeenCalled();
  });

  it("registers 2 jobs when announcementChannelId is set", () => {
    const scheduler = createMockScheduler();
    const client = createMockClient();
    const config = { announcementChannelId: "ch-announce" } as any;

    registerScheduledPosts(scheduler as any, client, config);

    expect(scheduler.register).toHaveBeenCalledTimes(2);
    expect(scheduler.jobs[0].name).toBe("Realm of the Week");
    expect(scheduler.jobs[0].interval).toBe("weekly");
    expect(scheduler.jobs[1].name).toBe("Summon of the Month");
    expect(scheduler.jobs[1].interval).toBe("monthly");
  });

  it("Realm of the Week callback sends an embed", async () => {
    const scheduler = createMockScheduler();
    const client = createMockClient();
    const config = { announcementChannelId: "ch-1" } as any;

    registerScheduledPosts(scheduler as any, client, config);

    // Execute the weekly callback
    await scheduler.jobs[0].fn();

    expect(client.channels.fetch).toHaveBeenCalledWith("ch-1");
    const channel = await client.channels.fetch.mock.results[0].value;
    expect(channel.send).toHaveBeenCalledTimes(1);

    const sentEmbed = channel.send.mock.calls[0][0].embeds[0].toJSON();
    expect(sentEmbed.title).toMatch(/Realm of the Week/);
  });

  it("Summon of the Month callback sends an embed about Octo", async () => {
    const scheduler = createMockScheduler();
    const client = createMockClient();
    const config = { announcementChannelId: "ch-1" } as any;

    registerScheduledPosts(scheduler as any, client, config);

    // Execute the monthly callback
    await scheduler.jobs[1].fn();

    const channel = await client.channels.fetch.mock.results[0].value;
    const sentEmbed = channel.send.mock.calls[0][0].embeds[0].toJSON();
    expect(sentEmbed.title).toContain("Octo");
    expect(sentEmbed.description).toContain("octopus");
  });
});
