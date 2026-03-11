import { Client, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import { createConsola } from "consola";
import type { Config } from "../config.js";
import type { GatewayClient } from "../gateway-client.js";
import { SessionStore } from "../session/session-store.js";
import { ChannelQueue } from "../streaming/queue.js";
import { handleMessageCreate } from "./events/message-create.js";
import { handleInteractionCreate } from "./events/interaction-create.js";
import { handleGuildMemberAdd } from "./events/guild-member-add.js";
import { getCommands, getCommandHandlers } from "./commands/index.js";

const log = createConsola({ defaults: { tag: "discord" } });

export interface BotContext {
  config: Config;
  gateway: GatewayClient;
  sessions: SessionStore;
  queue: ChannelQueue;
}

/**
 * Create and configure the Discord.js client.
 * Returns the client instance and a start/stop interface.
 */
export function createBot(ctx: BotContext) {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel], // Required for DM support
  });

  const commandHandlers = getCommandHandlers();

  // Wire events
  client.on("messageCreate", (message) => {
    void handleMessageCreate(message, ctx);
  });

  client.on("interactionCreate", (interaction) => {
    void handleInteractionCreate(interaction, ctx, commandHandlers);
  });

  client.on("guildMemberAdd", (member) => {
    void handleGuildMemberAdd(member, ctx);
  });

  client.once("ready", (c) => {
    log.info(`Discord bot logged in as ${c.user.tag}`);
  });

  client.on("error", (err) => {
    log.error(`Discord client error: ${err.message}`);
  });

  return {
    client,

    /** Login to Discord and register slash commands */
    async start(): Promise<void> {
      // Register slash commands
      await registerCommands(ctx.config);

      // Login
      await client.login(ctx.config.discordToken);
      log.info("Discord bot started");
    },

    /** Logout and destroy the client */
    async stop(): Promise<void> {
      client.destroy();
      log.info("Discord bot stopped");
    },
  };
}

async function registerCommands(config: Config): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.discordToken);
  const commands = getCommands().map((cmd) => cmd.data.toJSON());

  try {
    if (config.guildId) {
      // Dev: register to specific guild (instant)
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );
      log.info(`Registered ${commands.length} slash commands to guild ${config.guildId}`);
    } else {
      // Prod: register globally (may take up to 1h to propagate)
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands },
      );
      log.info(`Registered ${commands.length} slash commands globally`);
    }
  } catch (err) {
    log.error(`Failed to register slash commands: ${err instanceof Error ? err.message : String(err)}`);
  }
}
