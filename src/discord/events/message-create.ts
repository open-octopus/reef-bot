import type { Message } from "discord.js";
import { createConsola } from "consola";
import type { BotContext } from "../bot.js";
import { SessionStore } from "../../session/session-store.js";
import { DraftStream } from "../../streaming/draft-stream.js";
import type { DiscordTextChannel } from "../../streaming/draft-stream.js";

const log = createConsola({ defaults: { tag: "message" } });

/**
 * Handle incoming Discord messages.
 *
 * Trigger conditions:
 * 1. DM — always respond
 * 2. @mention — strip mention, process remaining text
 * 3. Reply to bot message — conversation continuation
 */
export async function handleMessageCreate(message: Message, ctx: BotContext): Promise<void> {
  // Ignore bots (including self)
  if (message.author.bot) return;

  const isDM = !message.guild;
  const isMention = message.mentions.has(message.client.user!);
  const isReplyToBot = message.reference?.messageId
    ? await isReplyToBotMessage(message)
    : false;

  // Only respond to DMs, @mentions, or replies to bot
  if (!isDM && !isMention && !isReplyToBot) return;

  // Extract clean text (strip @mention)
  let text = message.content;
  if (isMention && message.client.user) {
    text = text.replace(new RegExp(`<@!?${message.client.user.id}>`, "g"), "").trim();
  }

  if (!text) {
    await message.reply("How can I help? Just send me a message.");
    return;
  }

  // Check gateway connection
  if (!ctx.gateway.isConnected()) {
    await message.reply("I'm currently reconnecting to my brain... please try again in a moment.");
    return;
  }

  // Queue processing per channel to prevent concurrent streaming edits
  const channelId = message.channel.id;
  await ctx.queue.run(channelId, async () => {
    await processMessage(message, text, isDM, ctx);
  });
}

async function processMessage(
  message: Message,
  text: string,
  isDM: boolean,
  ctx: BotContext,
): Promise<void> {
  // Resolve session
  const sessionKey = SessionStore.key({
    isDM,
    channelId: message.channel.id,
    userId: message.author.id,
    threadId: message.channel.isThread() ? message.channel.id : undefined,
  });
  const sessionId = ctx.sessions.getOrCreate(sessionKey, message.author.id, message.channel.id);

  // Start typing indicator
  const channel = message.channel as DiscordTextChannel;
  await channel.sendTyping();

  // Set up streaming
  const stream = new DraftStream({ channel, replyTo: message });
  stream.start();

  try {
    const response = await ctx.gateway.chat(
      text,
      { sessionId, entityId: ctx.config.octoEntityId },
      {
        onToken: (token) => stream.push(token),
      },
    );

    // Finish with the final response text (or accumulated stream)
    const finalText = response.result
      ? (response.result as { response?: { content?: string } }).response?.content
      : undefined;
    await stream.finish(finalText);

    if (response.error) {
      log.warn(`RPC error: ${response.error.message}`);
      stream.cancel();
      await message.reply("Sorry, something went wrong processing your message.");
    }
  } catch (err) {
    stream.cancel();
    log.error(`Chat error: ${err instanceof Error ? err.message : String(err)}`);
    await message.reply("Sorry, I encountered an error. Please try again.").catch(() => {});
  }
}

async function isReplyToBotMessage(message: Message): Promise<boolean> {
  try {
    const ref = await message.channel.messages.fetch(message.reference!.messageId!);
    return ref.author.id === message.client.user!.id;
  } catch {
    return false;
  }
}
