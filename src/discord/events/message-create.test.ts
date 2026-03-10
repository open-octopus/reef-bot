import { describe, it, expect, vi } from "vitest";
import { handleMessageCreate } from "./message-create.js";
import type { BotContext } from "../bot.js";

function createMockMessage(overrides: Record<string, unknown> = {}) {
  const mockChannel = {
    id: "ch-123",
    send: vi.fn(),
    sendTyping: vi.fn(),
    isThread: () => false,
    messages: { fetch: vi.fn() },
  };

  return {
    author: { bot: false, id: "user-1" },
    content: "hello octo",
    guild: null, // DM by default
    channel: mockChannel,
    client: { user: { id: "bot-1" } },
    mentions: { has: vi.fn(() => false) },
    reference: null,
    reply: vi.fn(),
    ...overrides,
  } as any;
}

function createMockContext(): BotContext {
  return {
    config: {
      discordToken: "test",
      clientId: "test",
      gatewayUrl: "ws://localhost:19789",
      octoEntityId: "entity_octo_mascot",
    },
    gateway: {
      isConnected: vi.fn(() => true),
      chat: vi.fn(async () => ({
        id: "rpc_1",
        result: { response: { content: "Hi there!" } },
      })),
    },
    sessions: {
      getOrCreate: vi.fn(() => "sess_test"),
    },
    queue: {
      run: vi.fn(async (_id: string, fn: () => Promise<void>) => fn()),
    },
  } as any;
}

describe("handleMessageCreate", () => {
  it("ignores bot messages", async () => {
    const msg = createMockMessage({ author: { bot: true, id: "bot-1" } });
    const ctx = createMockContext();
    await handleMessageCreate(msg, ctx);
    expect(ctx.gateway.chat).not.toHaveBeenCalled();
  });

  it("responds to DMs", async () => {
    const msg = createMockMessage();
    const ctx = createMockContext();
    await handleMessageCreate(msg, ctx);
    expect(ctx.gateway.chat).toHaveBeenCalled();
  });

  it("ignores guild messages without mention or reply", async () => {
    const msg = createMockMessage({ guild: { id: "guild-1" } });
    const ctx = createMockContext();
    await handleMessageCreate(msg, ctx);
    expect(ctx.gateway.chat).not.toHaveBeenCalled();
  });

  it("replies when gateway is disconnected", async () => {
    const msg = createMockMessage();
    const ctx = createMockContext();
    (ctx.gateway.isConnected as any).mockReturnValue(false);
    await handleMessageCreate(msg, ctx);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("reconnecting"));
  });

  it("replies with hint when text is empty after stripping mention", async () => {
    const msg = createMockMessage({
      content: "<@bot-1>",
      guild: { id: "guild-1" },
      mentions: { has: vi.fn(() => true) },
      client: { user: { id: "bot-1" } },
    });
    const ctx = createMockContext();
    await handleMessageCreate(msg, ctx);
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("How can I help"));
  });
});
