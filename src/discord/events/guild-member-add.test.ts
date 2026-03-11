import { describe, it, expect, vi } from "vitest";
import { handleGuildMemberAdd } from "./guild-member-add.js";
import type { BotContext } from "../bot.js";

function createMockMember(overrides: Record<string, unknown> = {}) {
  const mockChannel = {
    isTextBased: () => true,
    send: vi.fn(),
  };

  return {
    displayName: "TestUser",
    user: { tag: "TestUser#1234" },
    send: vi.fn(),
    client: {
      channels: {
        fetch: vi.fn(async () => mockChannel),
      },
    },
    toString: () => "<@user-1>",
    _mockChannel: mockChannel,
    ...overrides,
  } as any;
}

function createMockContext(overrides: Partial<BotContext> = {}): BotContext {
  return {
    config: {
      discordToken: "test",
      clientId: "test",
      gatewayUrl: "ws://localhost:19789",
      octoEntityId: "entity_octo_mascot",
      welcomeChannelId: "welcome-ch",
    },
    gateway: {
      isConnected: vi.fn(() => true),
    },
    sessions: {
      getOrCreate: vi.fn(() => "sess_test"),
    },
    queue: {
      run: vi.fn(async (_id: string, fn: () => Promise<void>) => fn()),
    },
    ...overrides,
  } as any;
}

describe("handleGuildMemberAdd", () => {
  it("sends welcome DM embed", async () => {
    const member = createMockMember();
    const ctx = createMockContext();

    await handleGuildMemberAdd(member, ctx);

    expect(member.send).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: expect.stringContaining("Welcome") }) })],
    });
  });

  it("with welcomeChannelId configured, sends channel message", async () => {
    const member = createMockMember();
    const ctx = createMockContext();

    await handleGuildMemberAdd(member, ctx);

    expect(member.client.channels.fetch).toHaveBeenCalledWith("welcome-ch");
    expect(member._mockChannel.send).toHaveBeenCalledWith({
      content: expect.stringContaining("Welcome"),
      embeds: [expect.any(Object)],
    });
  });

  it("DM send failure does not crash, channel message still sent", async () => {
    const member = createMockMember();
    member.send.mockRejectedValue(new Error("Cannot send DM"));
    const ctx = createMockContext();

    await handleGuildMemberAdd(member, ctx);

    // Should not throw, and channel message should still be sent
    expect(member.client.channels.fetch).toHaveBeenCalledWith("welcome-ch");
    expect(member._mockChannel.send).toHaveBeenCalled();
  });

  it("no welcomeChannelId skips channel message", async () => {
    const member = createMockMember();
    const ctx = createMockContext({
      config: {
        discordToken: "test",
        clientId: "test",
        gatewayUrl: "ws://localhost:19789",
        octoEntityId: "entity_octo_mascot",
        welcomeChannelId: undefined,
      },
    } as any);

    await handleGuildMemberAdd(member, ctx);

    // DM should still be sent
    expect(member.send).toHaveBeenCalled();
    // Channel message should NOT be sent
    expect(member.client.channels.fetch).not.toHaveBeenCalled();
    expect(member._mockChannel.send).not.toHaveBeenCalled();
  });
});
