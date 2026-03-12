import { describe, it, expect, vi } from "vitest";
import { soulPreviewCommand } from "./soul-preview.js";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

import { readFileSync } from "node:fs";
const mockReadFileSync = readFileSync as ReturnType<typeof vi.fn>;

const SAMPLE_SOUL = `---
name: Octo
realm: community
identity:
  role: Friendly octopus companion
  personality: Playful and helpful
  speaking_style: Casual and upbeat
catchphrases:
  - "Eight arms, infinite possibilities!"
  - "Let me lend a tentacle."
coreMemory:
  - "The first community game night"
---

# Octo

The official OpenOctopus mascot.
`;

function createMockInteraction() {
  return {
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    options: {
      getString: vi.fn(),
    },
  } as any;
}

describe("soulPreviewCommand", () => {
  it("command name is 'soul'", () => {
    expect(soulPreviewCommand.data.name).toBe("soul");
  });

  it("replies with embed containing parsed SOUL data", async () => {
    mockReadFileSync.mockReturnValue(SAMPLE_SOUL);
    const interaction = createMockInteraction();

    await soulPreviewCommand.execute(interaction, {} as any);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0][0];
    const json = call.embeds[0].toJSON();

    expect(json.title).toBe("SOUL: Octo");
    const realmField = json.fields?.find((f: any) => f.name === "Realm");
    expect(realmField?.value).toBe("community");
    const roleField = json.fields?.find((f: any) => f.name === "Role");
    expect(roleField?.value).toBe("Friendly octopus companion");
  });

  it("includes catchphrases and core memory fields", async () => {
    mockReadFileSync.mockReturnValue(SAMPLE_SOUL);
    const interaction = createMockInteraction();

    await soulPreviewCommand.execute(interaction, {} as any);

    const json = interaction.reply.mock.calls[0][0].embeds[0].toJSON();
    const catchField = json.fields?.find((f: any) => f.name === "Catchphrases");
    expect(catchField?.value).toContain("Eight arms");

    const memField = json.fields?.find((f: any) => f.name === "Core Memory");
    expect(memField?.value).toContain("game night");
  });

  it("replies ephemeral when file cannot be read", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const interaction = createMockInteraction();

    await soulPreviewCommand.execute(interaction, {} as any);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: "Could not load SOUL.md file.",
      flags: 64,
    });
  });
});
