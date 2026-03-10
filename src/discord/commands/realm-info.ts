import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { CommandHandler } from "./index.js";

const COLORS = {
  OCTOPUS_PURPLE: 0x6C3FA0,
  DEEP_OCEAN_BLUE: 0x1E3A5F,
} as const;

export const realmInfoCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("realm")
    .setDescription("Look up realm information")
    .addStringOption((opt) =>
      opt.setName("name").setDescription("Realm name (e.g. pet, finance, health)").setRequired(false),
    ) as unknown as SlashCommandBuilder,

  async execute(interaction, ctx) {
    const name = interaction.options.getString("name");

    if (!ctx.gateway.isConnected()) {
      await interaction.reply({ content: "Gateway is currently offline.", flags: 64 });
      return;
    }

    await interaction.deferReply();

    if (name) {
      // Get specific realm
      const res = await ctx.gateway.getRealm(name);
      if (res.error) {
        await interaction.editReply(`Realm "${name}" not found.`);
        return;
      }

      const realm = res.result as { id: string; name: string; description?: string; status?: string };
      const embed = new EmbedBuilder()
        .setTitle(`Realm: ${realm.name}`)
        .setDescription(realm.description ?? "No description")
        .setColor(COLORS.OCTOPUS_PURPLE)
        .addFields(
          { name: "ID", value: realm.id, inline: true },
          { name: "Status", value: realm.status ?? "active", inline: true },
        );

      await interaction.editReply({ embeds: [embed] });
    } else {
      // List all realms
      const res = await ctx.gateway.listRealms();
      if (res.error) {
        await interaction.editReply("Failed to fetch realms.");
        return;
      }

      const realms = (res.result as { realms: { id: string; name: string }[] }).realms ?? [];
      if (realms.length === 0) {
        await interaction.editReply("No realms configured yet.");
        return;
      }

      const list = realms.map((r) => `- **${r.name}** (\`${r.id}\`)`).join("\n");
      const embed = new EmbedBuilder()
        .setTitle("Available Realms")
        .setDescription(list)
        .setColor(COLORS.DEEP_OCEAN_BLUE)
        .setFooter({ text: `${realms.length} realm(s)` });

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
