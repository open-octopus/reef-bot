import type { Client, TextChannel } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { createConsola } from "consola";
import type { Config } from "../config.js";

const log = createConsola({ defaults: { tag: "github-webhook" } });

interface ReleasePayload {
  action: string;
  release: {
    tag_name: string;
    name: string | null;
    body: string | null;
    html_url: string;
    author: {
      login: string;
      avatar_url: string;
    };
  };
  repository: {
    full_name: string;
  };
}

interface PushPayload {
  ref: string;
  commits: unknown[];
  compare: string;
  repository: {
    full_name: string;
    default_branch: string;
  };
  pusher: {
    name: string;
  };
}

/**
 * Create a GitHub webhook event handler that posts notifications to Discord.
 */
export function createGitHubWebhookHandler(
  client: Client,
  config: Config,
): (event: string, payload: unknown) => Promise<void> {
  return async (event: string, payload: unknown): Promise<void> => {
    const channelId = config.announcementChannelId;
    if (!channelId) {
      log.debug("No announcement channel configured — skipping webhook notification");
      return;
    }

    switch (event) {
      case "release":
        await handleRelease(client, channelId, payload as ReleasePayload);
        break;
      case "push":
        await handlePush(client, channelId, payload as PushPayload);
        break;
      default:
        // Silently ignore other events
        break;
    }
  };
}

async function handleRelease(client: Client, channelId: string, payload: ReleasePayload): Promise<void> {
  if (payload.action !== "published") return;

  const { release, repository } = payload;
  const title = release.name || release.tag_name;
  const body = release.body
    ? release.body.length > 1024
      ? release.body.slice(0, 1021) + "..."
      : release.body
    : "No release notes provided.";

  const embed = new EmbedBuilder()
    .setTitle(`\u{1F680} New Release: ${title}`)
    .setDescription(body)
    .setColor(0x238636)
    .setURL(release.html_url)
    .addFields(
      { name: "Repository", value: repository.full_name, inline: true },
      { name: "Tag", value: release.tag_name, inline: true },
      { name: "Author", value: release.author.login, inline: true },
    )
    .setThumbnail(release.author.avatar_url)
    .setTimestamp();

  await sendToChannel(client, channelId, embed);
  log.info(`Posted release notification: ${title} (${repository.full_name})`);
}

async function handlePush(client: Client, channelId: string, payload: PushPayload): Promise<void> {
  const { ref, commits, compare, repository, pusher } = payload;
  const branch = ref.replace("refs/heads/", "");

  // Only notify for pushes to the default branch
  if (branch !== repository.default_branch) return;

  const commitCount = commits.length;
  const embed = new EmbedBuilder()
    .setTitle(`\u{1F4E6} ${commitCount} new commit${commitCount === 1 ? "" : "s"} to ${repository.full_name}`)
    .setDescription(
      `**${pusher.name}** pushed ${commitCount} commit${commitCount === 1 ? "" : "s"} to \`${branch}\`.\n\n` +
      `[View changes](${compare})`,
    )
    .setColor(0x0969da)
    .setTimestamp();

  await sendToChannel(client, channelId, embed);
  log.info(`Posted push notification: ${commitCount} commits to ${repository.full_name}/${branch}`);
}

async function sendToChannel(client: Client, channelId: string, embed: EmbedBuilder): Promise<void> {
  try {
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased()) {
      await (channel as TextChannel).send({ embeds: [embed] });
    } else {
      log.warn(`Announcement channel ${channelId} is not a text channel`);
    }
  } catch (err) {
    log.error(`Failed to send webhook notification: ${err instanceof Error ? err.message : String(err)}`);
  }
}
