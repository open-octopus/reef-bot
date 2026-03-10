import type { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { BotContext } from "../bot.js";
import { realmInfoCommand } from "./realm-info.js";
import { summonDemoCommand } from "./summon-demo.js";
import { soulPreviewCommand } from "./soul-preview.js";
import { helpCommand } from "./help.js";
import { docsCommand } from "./docs.js";

export interface CommandHandler {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction, ctx: BotContext) => Promise<void>;
}

const commands: CommandHandler[] = [
  realmInfoCommand,
  summonDemoCommand,
  soulPreviewCommand,
  helpCommand,
  docsCommand,
];

export function getCommands(): CommandHandler[] {
  return commands;
}

export function getCommandHandlers(): Map<string, CommandHandler> {
  const map = new Map<string, CommandHandler>();
  for (const cmd of commands) {
    map.set(cmd.data.name, cmd);
  }
  return map;
}
