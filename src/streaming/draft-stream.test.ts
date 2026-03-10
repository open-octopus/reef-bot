import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DraftStream } from "./draft-stream.js";

function createMockChannel() {
  const messages: { content: string; edits: string[] }[] = [];

  const mockMessage = (content: string) => ({
    content,
    edits: [] as string[],
    edit: vi.fn(async (newContent: string) => {
      mockMessage.edits = [...mockMessage.edits, newContent]; // Fix: assign for test visibility
      return mockMessage;
    }),
    reply: vi.fn(async (replyContent: string) => {
      const m = createSentMessage(replyContent);
      messages.push(m);
      return m;
    }),
  });

  const createSentMessage = (content: string) => {
    const msg = {
      content,
      edits: [] as string[],
      edit: vi.fn(async (newContent: string) => {
        msg.edits.push(newContent);
        msg.content = newContent;
        return msg;
      }),
      reply: vi.fn(async (replyContent: string) => {
        const m = createSentMessage(replyContent);
        messages.push(m);
        return m;
      }),
    };
    return msg;
  };

  const channel = {
    send: vi.fn(async (content: string) => {
      const msg = createSentMessage(content);
      messages.push(msg);
      return msg;
    }),
    messages,
  };

  return { channel, messages, mockMessage, createSentMessage };
}

describe("DraftStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends final message directly for short content", async () => {
    const { channel } = createMockChannel();
    const stream = new DraftStream({ channel: channel as any });
    stream.start();

    stream.push("Hello world");
    await stream.finish();

    expect(channel.send).toHaveBeenCalledWith("Hello world");
  });

  it("replies to referenced message", async () => {
    const { channel, createSentMessage } = createMockChannel();
    const replyTo = createSentMessage("user message");

    const stream = new DraftStream({ channel: channel as any, replyTo: replyTo as any });
    stream.start();

    stream.push("Response");
    await stream.finish();

    expect(replyTo.reply).toHaveBeenCalledWith("Response");
  });

  it("accumulates tokens", () => {
    const { channel } = createMockChannel();
    const stream = new DraftStream({ channel: channel as any });

    stream.push("Hello");
    stream.push(" ");
    stream.push("world");

    expect(stream.text).toBe("Hello world");
    stream.cancel();
  });

  it("splits long messages on finish", async () => {
    const { channel } = createMockChannel();
    const stream = new DraftStream({ channel: channel as any });
    stream.start();

    // Generate text longer than 2000 chars
    const longText = "A".repeat(1500) + "\n\n" + "B".repeat(1500);
    stream.push(longText);
    await stream.finish();

    // Should have sent multiple messages
    expect(channel.send.mock.calls.length).toBeGreaterThanOrEqual(2);
    stream.cancel();
  });

  it("cancel stops the stream", () => {
    const { channel } = createMockChannel();
    const stream = new DraftStream({ channel: channel as any });
    stream.start();
    stream.push("test");
    stream.cancel();

    // No further sends after cancel
    expect(channel.send).not.toHaveBeenCalled();
  });
});
