import { z } from "zod";

const ConfigSchema = z.object({
  /** Discord bot token */
  discordToken: z.string().min(1, "DISCORD_BOT_TOKEN is required"),
  /** Discord application ID for slash command registration */
  clientId: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  /** Optional guild ID — limits slash commands to this guild in dev */
  guildId: z.string().optional(),
  /** ink gateway WebSocket URL */
  gatewayUrl: z.string().url().default("ws://localhost:19789"),
  /** Octo entity ID for Summon routing */
  octoEntityId: z.string().default("entity_octo_mascot"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    discordToken: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.REEF_GUILD_ID || undefined,
    gatewayUrl: process.env.INK_GATEWAY_URL || "ws://localhost:19789",
    octoEntityId: process.env.OCTO_ENTITY_ID || "entity_octo_mascot",
  });
}
