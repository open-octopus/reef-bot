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
  /** Optional channel ID for new-member welcome messages */
  welcomeChannelId: z.string().optional(),
  /** Optional channel ID for scheduled announcements and webhook notifications */
  announcementChannelId: z.string().optional(),
  /** Optional port for the webhook HTTP server */
  webhookPort: z.coerce.number().int().min(1).max(65535).optional(),
  /** Optional secret for verifying GitHub webhook signatures */
  webhookSecret: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  return ConfigSchema.parse({
    discordToken: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.REEF_GUILD_ID || undefined,
    gatewayUrl: process.env.INK_GATEWAY_URL || "ws://localhost:19789",
    octoEntityId: process.env.OCTO_ENTITY_ID || "entity_octo_mascot",
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID || undefined,
    announcementChannelId: process.env.ANNOUNCEMENT_CHANNEL_ID || undefined,
    webhookPort: process.env.WEBHOOK_PORT || undefined,
    webhookSecret: process.env.WEBHOOK_SECRET || undefined,
  });
}
