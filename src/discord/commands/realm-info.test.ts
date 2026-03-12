import { describe, it, expect, vi } from "vitest";
import { realmInfoCommand } from "./realm-info.js";
import type { BotContext } from "../bot.js";

function createMockInteraction(name: string | null = null) {
  return {
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    options: {
      getString: vi.fn(() => name),
    },
  } as any;
}

function createMockContext(overrides: Record<string, unknown> = {}): BotContext {
  return {
    config: {
      discordToken: "test",
      clientId: "test",
      gatewayUrl: "ws://localhost:19789",
      octoEntityId: "entity_octo",
    },
    gateway: {
      isConnected: vi.fn(() => true),
      getRealm: vi.fn(),
      listRealms: vi.fn(),
      ...overrides,
    },
    sessions: {
      getOrCreate: vi.fn(() => "sess_test"),
    },
    queue: {
      run: vi.fn(async (_id: string, fn: () => Promise<void>) => fn()),
    },
  } as any;
}

describe("realmInfoCommand", () => {
  it("command name is 'realm'", () => {
    expect(realmInfoCommand.data.name).toBe("realm");
  });

  it("replies ephemeral when gateway is offline", async () => {
    const interaction = createMockInteraction();
    const ctx = createMockContext({ isConnected: vi.fn(() => false) });

    await realmInfoCommand.execute(interaction, ctx);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Gateway is currently offline.",
      flags: 64,
    });
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it("shows specific realm detail when name given", async () => {
    const interaction = createMockInteraction("pet");
    const ctx = createMockContext({
      getRealm: vi.fn().mockResolvedValue({
        result: { id: "realm_pet", name: "Pet", description: "Pet care realm", status: "active" },
      }),
    });

    await realmInfoCommand.execute(interaction, ctx);

    expect(interaction.deferReply).toHaveBeenCalled();
    expect(ctx.gateway.getRealm).toHaveBeenCalledWith("pet");

    const call = interaction.editReply.mock.calls[0][0];
    const json = call.embeds[0].toJSON();
    expect(json.title).toBe("Realm: Pet");
    expect(json.description).toBe("Pet care realm");
  });

  it("shows error when realm not found", async () => {
    const interaction = createMockInteraction("nonexistent");
    const ctx = createMockContext({
      getRealm: vi.fn().mockResolvedValue({ error: "Not found" }),
    });

    await realmInfoCommand.execute(interaction, ctx);

    expect(interaction.editReply).toHaveBeenCalledWith('Realm "nonexistent" not found.');
  });

  it("lists all realms when no name given", async () => {
    const interaction = createMockInteraction(null);
    const ctx = createMockContext({
      listRealms: vi.fn().mockResolvedValue({
        result: {
          realms: [
            { id: "realm_pet", name: "Pet" },
            { id: "realm_finance", name: "Finance" },
          ],
        },
      }),
    });

    await realmInfoCommand.execute(interaction, ctx);

    expect(ctx.gateway.listRealms).toHaveBeenCalled();

    const call = interaction.editReply.mock.calls[0][0];
    const json = call.embeds[0].toJSON();
    expect(json.title).toBe("Available Realms");
    expect(json.description).toContain("Pet");
    expect(json.description).toContain("Finance");
    expect(json.footer?.text).toBe("2 realm(s)");
  });

  it("shows message when no realms configured", async () => {
    const interaction = createMockInteraction(null);
    const ctx = createMockContext({
      listRealms: vi.fn().mockResolvedValue({ result: { realms: [] } }),
    });

    await realmInfoCommand.execute(interaction, ctx);

    expect(interaction.editReply).toHaveBeenCalledWith("No realms configured yet.");
  });
});
