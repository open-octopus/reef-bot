import type { GuildMember, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { createConsola } from "consola";
import type { BotContext } from "../bot.js";

const log = createConsola({ defaults: { tag: "guild-member-add" } });

/**
 * Handle new members joining the guild.
 * Sends a welcome DM and optionally announces in the welcome channel.
 */
export async function handleGuildMemberAdd(member: GuildMember, ctx: BotContext): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("Welcome to The Reef! \u{1F419}")
    .setDescription(
      `Hey **${member.displayName}**, welcome aboard! We're glad you're here.\n\n` +
      "The Reef is a vibrant community where you can summon helpful companions, " +
      "explore different realms, and connect with others. Here are a few tips to get started:",
    )
    .setColor(0x7289da)
    .addFields(
      {
        name: "\u{1F680} Getting Started",
        value: "Introduce yourself and say hello! Feel free to explore the channels and jump into any conversation.",
      },
      {
        name: "\u{1F4AC} Channels",
        value: "Check out the different channels to find topics that interest you. Each channel has a description to help you navigate.",
      },
      {
        name: "\u{1F419} Meet Octo",
        value: "Mention me in any channel or send me a DM to chat! I'm here to help you navigate The Reef.",
      },
    )
    .setTimestamp();

  // Send welcome DM
  try {
    await member.send({ embeds: [embed] });
    log.info(`Sent welcome DM to ${member.user.tag}`);
  } catch {
    log.warn(`Could not send welcome DM to ${member.user.tag} (DMs may be disabled)`);
  }

  // Send to welcome channel if configured
  const welcomeChannelId = ctx.config.welcomeChannelId;
  if (welcomeChannelId) {
    try {
      const channel = await member.client.channels.fetch(welcomeChannelId);
      if (channel?.isTextBased()) {
        await (channel as TextChannel).send({
          content: `Welcome to The Reef, ${member}! \u{1F44B}`,
          embeds: [embed],
        });
        log.info(`Posted welcome message for ${member.user.tag} in channel ${welcomeChannelId}`);
      }
    } catch (err) {
      log.error(`Failed to send welcome channel message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
