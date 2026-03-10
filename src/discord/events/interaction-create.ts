import type { Interaction } from "discord.js";
import { createConsola } from "consola";
import type { BotContext } from "../bot.js";
import type { CommandHandler } from "../commands/index.js";

const log = createConsola({ defaults: { tag: "interaction" } });

export async function handleInteractionCreate(
  interaction: Interaction,
  ctx: BotContext,
  commandHandlers: Map<string, CommandHandler>,
): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const handler = commandHandlers.get(interaction.commandName);
  if (!handler) {
    log.warn(`Unknown command: ${interaction.commandName}`);
    await interaction.reply({ content: "Unknown command.", flags: 64 });
    return;
  }

  try {
    await handler.execute(interaction, ctx);
  } catch (err) {
    log.error(`Command error (${interaction.commandName}): ${err instanceof Error ? err.message : String(err)}`);
    const reply = { content: "An error occurred running this command.", flags: 64 as const };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
}
