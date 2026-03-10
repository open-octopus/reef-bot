import type { Message, TextChannel, DMChannel, ThreadChannel } from "discord.js";
import { createConsola } from "consola";
import { splitMessage, DISCORD_MAX_LENGTH } from "../discord/format.js";

const log = createConsola({ defaults: { tag: "stream" } });

/** Edit throttle interval (ms) — Discord rate limit is ~5 edits per 5s */
const EDIT_THROTTLE_MS = 1200;

/** Minimum chars before sending first message */
const MIN_INITIAL_CHARS = 10;

/** Streaming cursor indicator */
const CURSOR = " **▌**";

export type DiscordTextChannel = TextChannel | DMChannel | ThreadChannel;

export interface DraftStreamOptions {
  /** Channel to send messages in */
  channel: DiscordTextChannel;
  /** Message to reply to */
  replyTo?: Message;
}

/**
 * Progressive message editing engine for Discord.
 *
 * Pattern (adapted from Telegram adapter):
 * 1. Accumulate tokens from LLM stream
 * 2. Every EDIT_THROTTLE_MS, edit message with `buffer + "▌"`
 * 3. On completion, final edit with full text, auto-split if > 2000 chars
 */
export class DraftStream {
  private channel: DiscordTextChannel;
  private replyTo?: Message;
  private sentMessage?: Message;
  private accumulated = "";
  private lastSentLength = 0;
  private editing = false;
  private intervalId?: ReturnType<typeof setInterval>;
  private finished = false;

  constructor(options: DraftStreamOptions) {
    this.channel = options.channel;
    this.replyTo = options.replyTo;
  }

  /** Start the periodic edit timer */
  start(): void {
    this.intervalId = setInterval(() => {
      void this.tick();
    }, EDIT_THROTTLE_MS);
  }

  /** Push a token from the LLM stream */
  push(token: string): void {
    this.accumulated += token;
  }

  /**
   * Finish the stream — send final formatted message(s).
   * @param finalText Optional override for the final text (e.g., from RPC response).
   */
  async finish(finalText?: string): Promise<void> {
    this.finished = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    const text = finalText || this.accumulated;
    if (!text) return;

    const chunks = splitMessage(text);

    try {
      if (this.sentMessage) {
        // Edit existing message with first chunk
        await this.sentMessage.edit(chunks[0]);
        // Send remaining chunks
        for (let i = 1; i < chunks.length; i++) {
          await this.channel.send(chunks[i]);
        }
      } else {
        // Never sent an initial message — send all chunks
        for (let i = 0; i < chunks.length; i++) {
          if (i === 0 && this.replyTo) {
            await this.replyTo.reply(chunks[i]);
          } else {
            await this.channel.send(chunks[i]);
          }
        }
      }
    } catch (err) {
      log.error(`Failed to send final message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /** Cancel the stream (e.g., on error) */
  cancel(): void {
    this.finished = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /** Current accumulated text */
  get text(): string {
    return this.accumulated;
  }

  // ── Internal ──

  private async tick(): Promise<void> {
    if (this.editing || this.finished) return;
    if (this.accumulated.length === this.lastSentLength) return;
    if (this.accumulated.length < MIN_INITIAL_CHARS && !this.sentMessage) return;

    this.editing = true;
    // Truncate preview to fit Discord limit with cursor
    const preview = this.accumulated.length > DISCORD_MAX_LENGTH - CURSOR.length
      ? this.accumulated.slice(0, DISCORD_MAX_LENGTH - CURSOR.length - 3) + "..."
      : this.accumulated;
    const text = preview + CURSOR;
    this.lastSentLength = this.accumulated.length;

    try {
      if (!this.sentMessage) {
        if (this.replyTo) {
          this.sentMessage = await this.replyTo.reply(text);
        } else {
          this.sentMessage = await this.channel.send(text);
        }
      } else {
        await this.sentMessage.edit(text);
      }
    } catch (err) {
      // Ignore edit failures (rate limit, message deleted, etc.)
      log.debug(`Stream edit error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.editing = false;
    }
  }
}
