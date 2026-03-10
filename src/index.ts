import { createConsola } from "consola";
import { loadConfig } from "./config.js";
import { GatewayClient } from "./gateway-client.js";
import { createBot } from "./discord/bot.js";
import { SessionStore } from "./session/session-store.js";
import { ChannelQueue } from "./streaming/queue.js";

const log = createConsola({ defaults: { tag: "reef-bot" } });

async function main(): Promise<void> {
  log.info("Starting reef-bot...");

  // Load and validate configuration
  const config = loadConfig();
  log.info(`Gateway: ${config.gatewayUrl}`);
  log.info(`Octo entity: ${config.octoEntityId}`);

  // Create gateway client with auto-reconnect
  const gateway = new GatewayClient({
    url: config.gatewayUrl,
    onStateChange: (state) => {
      log.info(`Gateway state: ${state}`);
    },
  });

  // Connect to gateway
  log.info("Connecting to ink gateway...");
  const connected = await gateway.tryConnect();
  if (!connected) {
    log.warn("Could not connect to ink gateway — will retry in background");
  }

  // Auto-summon Octo if connected
  if (connected) {
    await summonOcto(gateway, config.octoEntityId);
  }

  // Create session store with 1h TTL and periodic cleanup
  const sessions = new SessionStore(60 * 60 * 1000);
  const pruneInterval = setInterval(() => {
    const pruned = sessions.prune();
    if (pruned > 0) log.debug(`Pruned ${pruned} expired sessions`);
  }, 5 * 60 * 1000);

  // Create channel queue for per-channel serialization
  const queue = new ChannelQueue();

  // Create and start Discord bot
  const bot = createBot({ config, gateway, sessions, queue });
  await bot.start();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down...`);
    clearInterval(pruneInterval);
    await bot.stop();
    await gateway.disconnect();
    sessions.clear();
    log.info("Goodbye from The Reef.");
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  log.info("reef-bot is live in The Reef!");
}

async function summonOcto(gateway: GatewayClient, entityId: string): Promise<void> {
  try {
    const res = await gateway.summonEntity(entityId);
    if (res.error) {
      // Entity might already be summoned, or not exist yet
      log.warn(`Summon Octo: ${res.error.message} (code: ${res.error.code})`);
    } else {
      log.info(`Octo summoned successfully (${entityId})`);
    }
  } catch (err) {
    log.warn(`Failed to summon Octo: ${err instanceof Error ? err.message : String(err)}`);
  }
}

main().catch((err) => {
  log.fatal(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
