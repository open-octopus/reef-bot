import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { CommandHandler } from "./index.js";

export const summonDemoCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("summon")
    .setDescription("See a live demo of the Summon engine") as SlashCommandBuilder,

  async execute(interaction, ctx) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setTitle("Summon Engine Demo")
      .setDescription(
        "The **Summon** engine transforms real-world entities into living AI Agents " +
        "with memory, personality, and proactive behavior.\n\n" +
        "Right now, I (Octo) am a **summoned entity** — my personality comes from a SOUL.md file " +
        "that defines who I am, how I speak, and what I remember.",
      )
      .setColor(0x00D4AA) // SUMMON_CYAN
      .addFields(
        { name: "Entity", value: `\`${ctx.config.octoEntityId}\``, inline: true },
        { name: "Realm", value: "community", inline: true },
        { name: "Tier", value: "summoned", inline: true },
        {
          name: "How it works",
          value:
            "1. Write a **SOUL.md** — personality, memories, behaviors\n" +
            "2. **Summon** the entity via `summon.invoke`\n" +
            "3. The entity comes alive with its own agent\n" +
            "4. Chat with it — it remembers and grows",
        },
        {
          name: "Try it",
          value: "Just @mention me or send me a DM to chat with the summoned Octo!",
        },
      )
      .setFooter({ text: "Powered by OpenOctopus Summon Engine" });

    await interaction.editReply({ embeds: [embed] });
  },
};
