import { describe, it, expect, vi } from "vitest";
import { handleInteractionCreate } from "./interaction-create.js";
import type { BotContext } from "../bot.js";
import type { CommandHandler } from "../commands/index.js";

function createMockInteraction(overrides: Record<string, unknown> = {}) {
  return {
    isChatInputCommand: () => true,
    commandName: "help",
    reply: vi.fn(),
    followUp: vi.fn(),
    deferred: false,
    replied: false,
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
      chat: vi.fn(),
    },
    sessions: {
      getOrCreate: vi.fn(() => "sess_test"),
    },
    queue: {
      run: vi.fn(async (_id: string, fn: () => Promise<void>) => fn()),
    },
  } as any;
}

describe("handleInteractionCreate", () => {
  it("ignores non-command interactions", async () => {
    const interaction = createMockInteraction({
      isChatInputCommand: () => false,
    });
    const ctx = createMockContext();
    const handlers = new Map<string, CommandHandler>();

    await handleInteractionCreate(interaction, ctx, handlers);

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("replies 'Unknown command' for unregistered command names", async () => {
    const interaction = createMockInteraction({ commandName: "nonexistent" });
    const ctx = createMockContext();
    const handlers = new Map<string, CommandHandler>();

    await handleInteractionCreate(interaction, ctx, handlers);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Unknown command.",
      flags: 64,
    });
  });

  it("calls handler.execute for a known command", async () => {
    const interaction = createMockInteraction({ commandName: "help" });
    const ctx = createMockContext();
    const mockHandler: CommandHandler = {
      data: { name: "help" } as any,
      execute: vi.fn(),
    };
    const handlers = new Map<string, CommandHandler>([["help", mockHandler]]);

    await handleInteractionCreate(interaction, ctx, handlers);

    expect(mockHandler.execute).toHaveBeenCalledWith(interaction, ctx);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("replies with error message when handler throws (not deferred)", async () => {
    const interaction = createMockInteraction({
      commandName: "help",
      deferred: false,
      replied: false,
    });
    const ctx = createMockContext();
    const mockHandler: CommandHandler = {
      data: { name: "help" } as any,
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const handlers = new Map<string, CommandHandler>([["help", mockHandler]]);

    await handleInteractionCreate(interaction, ctx, handlers);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "An error occurred running this command.",
      flags: 64,
    });
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("uses followUp when handler throws after deferral", async () => {
    const interaction = createMockInteraction({
      commandName: "help",
      deferred: true,
      replied: false,
    });
    const ctx = createMockContext();
    const mockHandler: CommandHandler = {
      data: { name: "help" } as any,
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const handlers = new Map<string, CommandHandler>([["help", mockHandler]]);

    await handleInteractionCreate(interaction, ctx, handlers);

    expect(interaction.followUp).toHaveBeenCalledWith({
      content: "An error occurred running this command.",
      flags: 64,
    });
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
