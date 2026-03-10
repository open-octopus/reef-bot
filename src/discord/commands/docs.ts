import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { CommandHandler } from "./index.js";

const DOCS: Record<string, { title: string; url: string; description: string }> = {
  quickstart: {
    title: "Quick Start Guide",
    url: "https://github.com/open-octopus/openoctopus#quick-start",
    description: "Get OpenOctopus running in minutes.",
  },
  realm: {
    title: "Realm System",
    url: "https://github.com/open-octopus/openoctopus/blob/main/docs/project-spec.md",
    description: "How Realms organize your life into autonomous domains.",
  },
  summon: {
    title: "Summon Engine",
    url: "https://github.com/open-octopus/openoctopus/tree/main/packages/summon",
    description: "Transform entities into living AI Agents with SOUL.md.",
  },
  soul: {
    title: "SOUL.md Format",
    url: "https://github.com/open-octopus/soul-gallery",
    description: "Personality files that define summoned entities.",
  },
  cli: {
    title: "Tentacle CLI",
    url: "https://github.com/open-octopus/openoctopus/tree/main/packages/tentacle",
    description: "Command-line interface for interacting with OpenOctopus.",
  },
  gateway: {
    title: "Ink Gateway",
    url: "https://github.com/open-octopus/openoctopus/tree/main/packages/ink",
    description: "Dual-port gateway — WS RPC + HTTP REST.",
  },
  channels: {
    title: "Channel System",
    url: "https://github.com/open-octopus/openoctopus/tree/main/packages/channels",
    description: "Messaging platform adapters (Telegram, Discord, Slack).",
  },
  api: {
    title: "WS RPC API",
    url: "https://github.com/open-octopus/openoctopus/blob/main/packages/shared/src/rpc-protocol.ts",
    description: "WebSocket RPC protocol reference.",
  },
};

export const docsCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("docs")
    .setDescription("Quick link to OpenOctopus documentation")
    .addStringOption((opt) =>
      opt
        .setName("topic")
        .setDescription("Documentation topic")
        .setRequired(false)
        .addChoices(
          ...Object.entries(DOCS).map(([key, val]) => ({ name: val.title, value: key })),
        ),
    ) as unknown as SlashCommandBuilder,

  async execute(interaction) {
    const topic = interaction.options.getString("topic");

    if (topic && DOCS[topic]) {
      const doc = DOCS[topic];
      const embed = new EmbedBuilder()
        .setTitle(doc.title)
        .setDescription(`${doc.description}\n\n[Open Documentation](${doc.url})`)
        .setColor(0x1E3A5F); // DEEP_OCEAN_BLUE

      await interaction.reply({ embeds: [embed] });
    } else {
      // Show all topics
      const list = Object.entries(DOCS)
        .map(([key, doc]) => `**${key}** — [${doc.title}](${doc.url})\n${doc.description}`)
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle("OpenOctopus Documentation")
        .setDescription(list)
        .setColor(0x1E3A5F)
        .setFooter({ text: "Use /docs <topic> for a specific link" });

      await interaction.reply({ embeds: [embed] });
    }
  },
};
