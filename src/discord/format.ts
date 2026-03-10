/**
 * Discord message formatting utilities.
 * Discord supports native Markdown — no HTML conversion needed.
 * Max message length: 2000 characters.
 */

export const DISCORD_MAX_LENGTH = 2000;

/**
 * Split a message into chunks respecting Discord's 2000 char limit.
 * Tries to break at: paragraph -> newline -> space -> hard boundary.
 */
export function splitMessage(text: string, maxLength = DISCORD_MAX_LENGTH): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIdx = remaining.lastIndexOf("\n\n", maxLength);
    if (splitIdx < maxLength * 0.3) {
      splitIdx = remaining.lastIndexOf("\n", maxLength);
    }
    if (splitIdx < maxLength * 0.3) {
      splitIdx = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIdx < maxLength * 0.3) {
      splitIdx = maxLength;
    }

    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).trimStart();
  }

  return chunks;
}

/**
 * Truncate text to fit Discord embed description limit (4096 chars).
 */
export function truncateForEmbed(text: string, maxLength = 4096): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Format a code block for Discord.
 */
export function codeBlock(text: string, language = ""): string {
  return `\`\`\`${language}\n${text}\n\`\`\``;
}
