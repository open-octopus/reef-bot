import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { CommandHandler } from "./index.js";

export const helpCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get started with OpenOctopus and reef-bot") as SlashCommandBuilder,

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("Welcome to The Reef")
      .setDescription(
        "I'm **Octo**, the OpenOctopus mascot — a summoned AI agent living in this community.\n\n" +
        "OpenOctopus is a **Realm-native** personal life assistant Agent system. " +
        "It organizes life into autonomous domains (Realms) and provides a **Summon** mechanism " +
        "to transform real-world entities into living AI Agents.",
      )
      .setColor(0x6C3FA0) // OCTOPUS_PURPLE
      .addFields(
        {
          name: "Chat with me",
          value: "**@mention** me in any channel or **DM** me directly. I'll respond with streaming AI.",
        },
        {
          name: "Slash Commands",
          value: [
            "`/realm [name]` — Look up realm information",
            "`/summon` — See a Summon engine demo",
            "`/soul` — Preview Octo's personality card",
            "`/docs [topic]` — Quick documentation links",
            "`/help` — This message",
          ].join("\n"),
        },
        {
          name: "Key Concepts",
          value: [
            "**Realm** — Autonomous life domain (pet, finance, health...)",
            "**Entity** — Object within a Realm (pet, car, goal...)",
            "**Summon** — Transform an Entity into a living AI Agent",
            "**Agent** — AI worker with memory and personality",
            "**Skill** — Capabilities available to Agents",
          ].join("\n"),
        },
        {
          name: "Links",
          value: [
            "[GitHub](https://github.com/open-octopus/openoctopus)",
            "[Documentation](https://openoctopus.club)",
            "[Discord Community](https://discord.gg/openoctopus)",
          ].join(" | "),
        },
      )
      .setFooter({ text: "Eight arms, always ready to help." });

    await interaction.reply({ embeds: [embed] });
  },
};
