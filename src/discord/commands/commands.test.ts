import { describe, it, expect, vi } from "vitest";
import { helpCommand } from "./help.js";
import { summonDemoCommand } from "./summon-demo.js";
import type { BotContext } from "../bot.js";

function createMockInteraction(overrides: Record<string, unknown> = {}) {
  return {
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    options: {
      getString: vi.fn(),
    },
    ...overrides,
  } as any;
}

function createMockContext(): BotContext {
  return {
    config: {
      discordToken: "test",
      clientId: "test",
      gatewayUrl: "ws://localhost:19789",
      octoEntityId: "entity_octo",
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

describe("helpCommand", () => {
  it("replies with an embed containing 'Welcome to The Reef'", async () => {
    const interaction = createMockInteraction();
    const ctx = createMockContext();

    await helpCommand.execute(interaction, ctx);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0][0];
    expect(call.embeds).toHaveLength(1);

    const embed = call.embeds[0];
    const json = embed.toJSON();
    expect(json.title).toBe("Welcome to The Reef");
  });

  it("embed includes a Slash Commands field", async () => {
    const interaction = createMockInteraction();
    const ctx = createMockContext();

    await helpCommand.execute(interaction, ctx);

    const embed = interaction.reply.mock.calls[0][0].embeds[0];
    const json = embed.toJSON();
    const field = json.fields?.find((f: any) => f.name === "Slash Commands");
    expect(field).toBeDefined();
    expect(field!.value).toContain("/help");
    expect(field!.value).toContain("/summon");
  });
});

describe("summonDemoCommand", () => {
  it("defers reply then edits with an embed", async () => {
    const interaction = createMockInteraction();
    const ctx = createMockContext();

    await summonDemoCommand.execute(interaction, ctx);

    expect(interaction.deferReply).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).toHaveBeenCalledTimes(1);

    const call = interaction.editReply.mock.calls[0][0];
    expect(call.embeds).toHaveLength(1);
  });

  it("embed title mentions 'Summon Engine'", async () => {
    const interaction = createMockInteraction();
    const ctx = createMockContext();

    await summonDemoCommand.execute(interaction, ctx);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const json = embed.toJSON();
    expect(json.title).toContain("Summon Engine");
  });
});
