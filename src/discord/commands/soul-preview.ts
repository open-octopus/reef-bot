import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import type { CommandHandler } from "./index.js";
import { codeBlock } from "../format.js";

export const soulPreviewCommand: CommandHandler = {
  data: new SlashCommandBuilder()
    .setName("soul")
    .setDescription("Preview Octo's SOUL.md personality card") as SlashCommandBuilder,

  async execute(interaction) {
    let soulContent: string;
    try {
      const soulPath = resolve(import.meta.dirname, "../../../souls/octo.soul.md");
      soulContent = readFileSync(soulPath, "utf-8");
    } catch {
      await interaction.reply({ content: "Could not load SOUL.md file.", flags: 64 });
      return;
    }

    // Parse basic YAML frontmatter
    const parsed = parseSoulFrontmatter(soulContent);

    const embed = new EmbedBuilder()
      .setTitle(`SOUL: ${parsed.name ?? "Octo"}`)
      .setColor(0xFFD700) // Gold (Summoner role color)
      .addFields(
        { name: "Realm", value: parsed.realm ?? "community", inline: true },
        { name: "Role", value: parsed.role ?? "Unknown", inline: true },
        { name: "Personality", value: parsed.personality ?? "Not defined" },
        { name: "Speaking Style", value: parsed.speakingStyle ?? "Not defined" },
      );

    if (parsed.catchphrases.length > 0) {
      embed.addFields({
        name: "Catchphrases",
        value: parsed.catchphrases.map((c) => `> ${c}`).join("\n"),
      });
    }

    if (parsed.coreMemory.length > 0) {
      embed.addFields({
        name: "Core Memory",
        value: parsed.coreMemory.map((m) => `- ${m}`).join("\n"),
      });
    }

    embed.addFields({
      name: "Raw SOUL.md",
      value: codeBlock(soulContent.slice(0, 900), "yaml"),
    });

    embed.setFooter({ text: "Use /summon to see how entities come alive" });

    await interaction.reply({ embeds: [embed] });
  },
};

interface SoulData {
  name?: string;
  realm?: string;
  role?: string;
  personality?: string;
  speakingStyle?: string;
  catchphrases: string[];
  coreMemory: string[];
}

function parseSoulFrontmatter(content: string): SoulData {
  const result: SoulData = { catchphrases: [], coreMemory: [] };

  // Simple YAML parser for SOUL.md frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  const yaml = match[1];
  const lines = yaml.split("\n");

  let currentKey = "";
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("name:")) {
      result.name = trimmed.slice(5).trim();
    } else if (trimmed.startsWith("realm:")) {
      result.realm = trimmed.slice(6).trim();
    } else if (trimmed.startsWith("role:")) {
      result.role = trimmed.slice(5).trim();
    } else if (trimmed.startsWith("personality:")) {
      const val = trimmed.slice(12).trim();
      if (val && !val.startsWith(">")) {
        result.personality = val;
      } else {
        currentKey = "personality";
        result.personality = "";
      }
    } else if (trimmed.startsWith("speaking_style:")) {
      const val = trimmed.slice(15).trim();
      if (val && !val.startsWith(">")) {
        result.speakingStyle = val;
      } else {
        currentKey = "speakingStyle";
        result.speakingStyle = "";
      }
    } else if (trimmed.startsWith("catchphrases:")) {
      currentKey = "catchphrases";
      inList = true;
    } else if (trimmed.startsWith("coreMemory:") || trimmed.startsWith("core_memory:")) {
      currentKey = "coreMemory";
      inList = true;
    } else if (trimmed.startsWith("- ") && inList) {
      const val = trimmed.slice(2).replace(/^["']|["']$/g, "");
      if (currentKey === "catchphrases") result.catchphrases.push(val);
      else if (currentKey === "coreMemory") result.coreMemory.push(val);
    } else if (currentKey === "personality" && trimmed && !trimmed.includes(":")) {
      result.personality = ((result.personality ?? "") + " " + trimmed).trim();
    } else if (currentKey === "speakingStyle" && trimmed && !trimmed.includes(":")) {
      result.speakingStyle = ((result.speakingStyle ?? "") + " " + trimmed).trim();
    } else if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      inList = false;
      currentKey = "";
    }
  }

  return result;
}
