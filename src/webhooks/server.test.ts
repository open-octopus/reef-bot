import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";
import { createWebhookServer } from "./server.js";

function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = require("node:net").createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

describe("createWebhookServer", () => {
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    port = await findFreePort();
    baseUrl = `http://localhost:${port}`;
  });

  it("starts and stops normally", async () => {
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler);

    await server.start();
    await server.stop();
  });

  it("POST /github with valid payload calls handler and returns 200", async () => {
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler);
    await server.start();

    try {
      const payload = { action: "opened", number: 1 };
      const res = await fetch(`${baseUrl}/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "issues",
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ ok: true });

      // handler is called asynchronously after response — give it a tick
      await new Promise((r) => setTimeout(r, 50));
      expect(handler).toHaveBeenCalledWith("issues", payload);
    } finally {
      await server.stop();
    }
  });

  it("GET /github returns 404", async () => {
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler);
    await server.start();

    try {
      const res = await fetch(`${baseUrl}/github`, { method: "GET" });
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body).toEqual({ error: "Not found" });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("POST to unknown path returns 404", async () => {
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler);
    await server.start();

    try {
      const res = await fetch(`${baseUrl}/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });

  it("with secret, valid HMAC signature passes", async () => {
    const secret = "test-secret-123";
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler, secret);
    await server.start();

    try {
      const payload = JSON.stringify({ action: "published" });
      const signature =
        "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");

      const res = await fetch(`${baseUrl}/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "release",
          "X-Hub-Signature-256": signature,
        },
        body: payload,
      });

      expect(res.status).toBe(200);
      await new Promise((r) => setTimeout(r, 50));
      expect(handler).toHaveBeenCalledWith("release", { action: "published" });
    } finally {
      await server.stop();
    }
  });

  it("with secret, invalid signature returns 401", async () => {
    const secret = "test-secret-123";
    const handler = vi.fn(async () => {});
    const server = createWebhookServer(port, handler, secret);
    await server.start();

    try {
      const payload = JSON.stringify({ action: "published" });
      const res = await fetch(`${baseUrl}/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "release",
          "X-Hub-Signature-256": "sha256=invalid",
        },
        body: payload,
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toEqual({ error: "Invalid signature" });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      await server.stop();
    }
  });
});
