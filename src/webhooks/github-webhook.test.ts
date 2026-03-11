import { describe, it, expect, vi } from "vitest";
import { createGitHubWebhookHandler } from "./github-webhook.js";
import type { Config } from "../config.js";

function createMockClient() {
  const mockChannel = {
    isTextBased: () => true,
    send: vi.fn(),
  };

  return {
    channels: {
      fetch: vi.fn(async () => mockChannel),
    },
    _mockChannel: mockChannel,
  };
}

function createMockConfig(overrides: Partial<Config> = {}): Config {
  return {
    discordToken: "test",
    clientId: "test",
    gatewayUrl: "ws://localhost:19789",
    octoEntityId: "entity_octo_mascot",
    announcementChannelId: "channel-announce",
    ...overrides,
  };
}

function makeReleasePayload(action = "published") {
  return {
    action,
    release: {
      tag_name: "v1.0.0",
      name: "Version 1.0.0",
      body: "Release notes here",
      html_url: "https://github.com/org/repo/releases/tag/v1.0.0",
      author: {
        login: "octocat",
        avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
      },
    },
    repository: {
      full_name: "org/repo",
    },
  };
}

function makePushPayload(branch = "main", defaultBranch = "main") {
  return {
    ref: `refs/heads/${branch}`,
    commits: [{ id: "abc123" }, { id: "def456" }],
    compare: "https://github.com/org/repo/compare/abc...def",
    repository: {
      full_name: "org/repo",
      default_branch: defaultBranch,
    },
    pusher: {
      name: "octocat",
    },
  };
}

describe("createGitHubWebhookHandler", () => {
  it("release published event sends embed", async () => {
    const client = createMockClient();
    const config = createMockConfig();
    const handler = createGitHubWebhookHandler(client as any, config);

    await handler("release", makeReleasePayload("published"));

    expect(client.channels.fetch).toHaveBeenCalledWith("channel-announce");
    expect(client._mockChannel.send).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: expect.stringContaining("Version 1.0.0") }) })],
    });
  });

  it("release non-published action is ignored", async () => {
    const client = createMockClient();
    const config = createMockConfig();
    const handler = createGitHubWebhookHandler(client as any, config);

    await handler("release", makeReleasePayload("created"));

    expect(client._mockChannel.send).not.toHaveBeenCalled();
  });

  it("push to default branch sends embed", async () => {
    const client = createMockClient();
    const config = createMockConfig();
    const handler = createGitHubWebhookHandler(client as any, config);

    await handler("push", makePushPayload("main", "main"));

    expect(client.channels.fetch).toHaveBeenCalledWith("channel-announce");
    expect(client._mockChannel.send).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ data: expect.objectContaining({ title: expect.stringContaining("2 new commit") }) })],
    });
  });

  it("push to non-default branch is ignored", async () => {
    const client = createMockClient();
    const config = createMockConfig();
    const handler = createGitHubWebhookHandler(client as any, config);

    await handler("push", makePushPayload("feature-branch", "main"));

    expect(client._mockChannel.send).not.toHaveBeenCalled();
  });

  it("no announcementChannelId skips all events", async () => {
    const client = createMockClient();
    const config = createMockConfig({ announcementChannelId: undefined });
    const handler = createGitHubWebhookHandler(client as any, config);

    await handler("release", makeReleasePayload("published"));
    await handler("push", makePushPayload("main", "main"));

    expect(client.channels.fetch).not.toHaveBeenCalled();
    expect(client._mockChannel.send).not.toHaveBeenCalled();
  });
});
