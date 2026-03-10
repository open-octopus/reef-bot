import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketServer } from "ws";
import { GatewayClient } from "./gateway-client.js";

function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = require("node:net").createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

describe("GatewayClient", () => {
  let wss: WebSocketServer;
  let port: number;
  let client: GatewayClient;

  beforeEach(async () => {
    port = await findFreePort();
    wss = new WebSocketServer({ port });
    client = new GatewayClient({ url: `ws://localhost:${port}` });
  });

  afterEach(async () => {
    await client.disconnect();
    await new Promise<void>((resolve) => wss.close(() => resolve()));
  });

  it("connects and reports connected state", async () => {
    await client.connect();
    expect(client.isConnected()).toBe(true);
    expect(client.getState()).toBe("connected");
  });

  it("disconnects cleanly", async () => {
    await client.connect();
    await client.disconnect();
    expect(client.isConnected()).toBe(false);
    expect(client.getState()).toBe("disconnected");
  });

  it("sends RPC call and receives response", async () => {
    wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const req = JSON.parse(data.toString());
        ws.send(JSON.stringify({ id: req.id, result: { ok: true } }));
      });
    });

    await client.connect();
    const res = await client.call("status.health");
    expect(res.result).toEqual({ ok: true });
  });

  it("handles streaming tokens", async () => {
    wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const req = JSON.parse(data.toString());
        // Send tokens
        ws.send(JSON.stringify({ event: "chat.token", requestId: req.id, data: { token: "Hello" } }));
        ws.send(JSON.stringify({ event: "chat.token", requestId: req.id, data: { token: " world" } }));
        // Send response
        ws.send(JSON.stringify({ id: req.id, result: { response: "Hello world" } }));
      });
    });

    await client.connect();
    const tokens: string[] = [];
    const res = await client.chat("hi", {}, { onToken: (t) => tokens.push(t) });
    expect(tokens).toEqual(["Hello", " world"]);
    expect(res.result).toEqual({ response: "Hello world" });
  });

  it("rejects pending requests on disconnect", async () => {
    wss.on("connection", () => {
      // Never respond — let the request hang
    });

    await client.connect();
    const callPromise = client.call("status.health");
    await client.disconnect();
    await expect(callPromise).rejects.toThrow("Client disconnecting");
  });

  it("throws when calling without connection", async () => {
    await expect(client.call("status.health")).rejects.toThrow("Not connected");
  });

  it("fires onStateChange callbacks", async () => {
    const states: string[] = [];
    client = new GatewayClient({
      url: `ws://localhost:${port}`,
      onStateChange: (s) => states.push(s),
    });

    await client.connect();
    await client.disconnect();

    expect(states).toEqual(["connecting", "connected", "disconnected"]);
  });

  it("returns error responses from gateway", async () => {
    wss.on("connection", (ws) => {
      ws.on("message", (data) => {
        const req = JSON.parse(data.toString());
        ws.send(JSON.stringify({ id: req.id, error: { code: 404, message: "Not found" } }));
      });
    });

    await client.connect();
    const res = await client.call("realm.get", { id: "nonexistent" });
    expect(res.error).toEqual({ code: 404, message: "Not found" });
  });
});
