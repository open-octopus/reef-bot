import type { Client, TextChannel } from "discord.js";
import type { EmbedBuilder } from "discord.js";
import { createConsola } from "consola";

const log = createConsola({ defaults: { tag: "discord" } });

export async function sendToChannel(client: Client, channelId: string, embed: EmbedBuilder): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    } else {
      log.warn(`Channel ${channelId} is not a text channel`);
    }
  } catch (err) {
    log.error(`Failed to send to channel ${channelId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
