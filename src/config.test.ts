import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("loads valid config from env", () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_CLIENT_ID = "123456";
    process.env.REEF_GUILD_ID = "guild-789";
    process.env.INK_GATEWAY_URL = "ws://localhost:19789";

    const config = loadConfig();
    expect(config.discordToken).toBe("test-token");
    expect(config.clientId).toBe("123456");
    expect(config.guildId).toBe("guild-789");
    expect(config.gatewayUrl).toBe("ws://localhost:19789");
    expect(config.octoEntityId).toBe("entity_octo_mascot");
  });

  it("uses defaults for optional fields", () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_CLIENT_ID = "123456";

    const config = loadConfig();
    expect(config.guildId).toBeUndefined();
    expect(config.gatewayUrl).toBe("ws://localhost:19789");
    expect(config.octoEntityId).toBe("entity_octo_mascot");
  });

  it("throws on missing DISCORD_BOT_TOKEN", () => {
    process.env.DISCORD_CLIENT_ID = "123456";
    expect(() => loadConfig()).toThrow();
  });

  it("throws on missing DISCORD_CLIENT_ID", () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    expect(() => loadConfig()).toThrow();
  });

  it("accepts custom OCTO_ENTITY_ID", () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_CLIENT_ID = "123456";
    process.env.OCTO_ENTITY_ID = "entity_custom_octo";

    const config = loadConfig();
    expect(config.octoEntityId).toBe("entity_custom_octo");
  });
});
