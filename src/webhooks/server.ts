import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createConsola } from "consola";

const log = createConsola({ defaults: { tag: "webhook-server" } });

type WebhookHandler = (event: string, payload: unknown) => Promise<void>;

/**
 * Create a lightweight HTTP server for receiving webhooks.
 * Uses Node built-in http module — no Express dependency.
 */
export function createWebhookServer(
  port: number,
  handler: WebhookHandler,
  secret?: string,
) {
  const server = createServer((req, res) => {
    void handleRequest(req, res, handler, secret);
  });

  return {
    start(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.on("error", reject);
        server.listen(port, () => {
          log.info(`Webhook server listening on port ${port}`);
          resolve();
        });
      });
    },

    stop(): Promise<void> {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            log.info("Webhook server stopped");
            resolve();
          }
        });
      });
    },
  };
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  handler: WebhookHandler,
  secret?: string,
): Promise<void> {
  // Only accept POST /github
  if (req.method !== "POST" || req.url !== "/github") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    // Read body
    const body = await readBody(req);

    // Verify signature if secret is configured
    if (secret) {
      const signature = req.headers["x-hub-signature-256"];
      if (typeof signature !== "string" || !verifySignature(body, signature, secret)) {
        log.warn("Invalid webhook signature");
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid signature" }));
        return;
      }
    }

    // Parse JSON payload
    const payload: unknown = JSON.parse(body);
    const event = (req.headers["x-github-event"] as string) || "unknown";

    log.info(`Received GitHub webhook: ${event}`);

    // Respond immediately, process async
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));

    // Handle the event
    await handler(event, payload);
  } catch (err) {
    log.error(`Webhook error: ${err instanceof Error ? err.message : String(err)}`);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
