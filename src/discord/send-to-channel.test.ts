import { describe, it, expect, vi } from "vitest";
import { EmbedBuilder } from "discord.js";
import { sendToChannel } from "./send-to-channel.js";

function mockClient(channel: unknown) {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue(channel),
    },
  } as any;
}

describe("sendToChannel", () => {
  it("sends embed to a text-based channel", async () => {
    const send = vi.fn();
    const channel = { isTextBased: () => true, send };
    const client = mockClient(channel);
    const embed = new EmbedBuilder().setTitle("Test");

    await sendToChannel(client, "chan-1", embed);

    expect(client.channels.fetch).toHaveBeenCalledWith("chan-1");
    expect(send).toHaveBeenCalledWith({ embeds: [embed] });
  });

  it("does not send if channel is not text-based", async () => {
    const send = vi.fn();
    const channel = { isTextBased: () => false, send };
    const client = mockClient(channel);

    await sendToChannel(client, "chan-voice", new EmbedBuilder());

    expect(send).not.toHaveBeenCalled();
  });

  it("handles null channel gracefully", async () => {
    const client = mockClient(null);

    // Should not throw
    await sendToChannel(client, "chan-missing", new EmbedBuilder());
  });

  it("catches fetch errors without throwing", async () => {
    const client = {
      channels: {
        fetch: vi.fn().mockRejectedValue(new Error("Unknown Channel")),
      },
    } as any;

    // Should not throw
    await sendToChannel(client, "chan-bad", new EmbedBuilder());
  });
});
