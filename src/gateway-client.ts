import WebSocket from "ws";
import { createConsola } from "consola";
import {
  type RpcResponse,
  type RpcEvent,
  createRpcRequest,
  RPC_METHODS,
  RPC_EVENTS,
} from "./rpc-types.js";

const log = createConsola({ defaults: { tag: "gateway" } });

/** Gateway connection state */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface GatewayClientOptions {
  url: string;
  /** Max reconnect attempts (0 = unlimited). Default: 0 */
  maxReconnectAttempts?: number;
  /** Base delay for exponential backoff (ms). Default: 1000 */
  reconnectBaseDelay?: number;
  /** Max delay between reconnects (ms). Default: 30000 */
  reconnectMaxDelay?: number;
  /** Heartbeat interval (ms). Default: 30000 */
  heartbeatInterval?: number;
  /** RPC call timeout (ms). Default: 120000 */
  rpcTimeout?: number;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * WS RPC client for ink gateway.
 * Adapted from @openoctopus/tentacle api-client.ts with:
 * - Auto-reconnect with exponential backoff
 * - Heartbeat via status.health
 * - Connection state events
 */
export class GatewayClient {
  private ws: WebSocket | undefined;
  private url: string;
  private pendingRequests = new Map<string, {
    resolve: (value: RpcResponse) => void;
    reject: (error: Error) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
  }>();
  private state: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  private intentionalClose = false;

  private maxReconnectAttempts: number;
  private reconnectBaseDelay: number;
  private reconnectMaxDelay: number;
  private heartbeatInterval: number;
  private rpcTimeout: number;
  private onStateChange?: (state: ConnectionState) => void;

  constructor(options: GatewayClientOptions) {
    this.url = options.url;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 0;
    this.reconnectBaseDelay = options.reconnectBaseDelay ?? 1000;
    this.reconnectMaxDelay = options.reconnectMaxDelay ?? 30_000;
    this.heartbeatInterval = options.heartbeatInterval ?? 30_000;
    this.rpcTimeout = options.rpcTimeout ?? 120_000;
    this.onStateChange = options.onStateChange;
  }

  /** Connect to ink gateway */
  async connect(): Promise<void> {
    if (this.state === "connected") return;

    this.intentionalClose = false;
    this.setState("connecting");

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.on("open", () => {
        this.setState("connected");
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        log.info(`Connected to ink gateway: ${this.url}`);
        resolve();
      });

      this.ws.on("message", (data) => {
        this.handleMessage(data);
      });

      this.ws.on("error", (err) => {
        log.error(`WebSocket error: ${err.message}`);
        if (this.state === "connecting") {
          reject(err);
        }
      });

      this.ws.on("close", (code) => {
        log.warn(`WebSocket closed (code: ${code})`);
        this.stopHeartbeat();
        this.rejectAllPending("WebSocket connection closed");

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        } else {
          this.setState("disconnected");
        }
      });
    });
  }

  /** Gracefully disconnect */
  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    this.stopHeartbeat();
    clearTimeout(this.reconnectTimer);

    if (this.ws) {
      this.ws.close(1000, "Client disconnecting");
      this.ws = undefined;
    }

    this.rejectAllPending("Client disconnecting");
    this.setState("disconnected");
  }

  /** Send an RPC request and wait for response */
  async call(
    method: string,
    params?: Record<string, unknown>,
    callbacks?: { onToken?: (token: string) => void; onDone?: () => void },
  ): Promise<RpcResponse> {
    if (!this.ws || this.state !== "connected") {
      throw new Error("Not connected to gateway");
    }

    const request = createRpcRequest(method, params);

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        onToken: callbacks?.onToken,
        onDone: callbacks?.onDone,
      });
      this.ws!.send(JSON.stringify(request));

      setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`RPC timeout: ${method}`));
        }
      }, this.rpcTimeout);
    });
  }

  /** Send a chat message with streaming support */
  async chat(
    message: string,
    options?: { sessionId?: string; realmId?: string; entityId?: string },
    callbacks?: { onToken?: (token: string) => void; onDone?: () => void },
  ): Promise<RpcResponse> {
    return this.call(RPC_METHODS.CHAT_SEND, { message, ...options }, callbacks);
  }

  /** Get current connection state */
  getState(): ConnectionState {
    return this.state;
  }

  /** Check if connected */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /** Try to connect, return false on failure */
  async tryConnect(): Promise<boolean> {
    try {
      await this.connect();
      return true;
    } catch {
      return false;
    }
  }

  // ── Convenience RPC methods ──

  async listRealms(): Promise<RpcResponse> {
    return this.call(RPC_METHODS.REALM_LIST);
  }

  async getRealm(id: string): Promise<RpcResponse> {
    return this.call(RPC_METHODS.REALM_GET, { id });
  }

  async listEntities(realmId: string): Promise<RpcResponse> {
    return this.call(RPC_METHODS.ENTITY_LIST, { realmId });
  }

  async summonEntity(entityId: string): Promise<RpcResponse> {
    return this.call(RPC_METHODS.SUMMON_INVOKE, { entityId });
  }

  async releaseEntity(entityId: string): Promise<RpcResponse> {
    return this.call(RPC_METHODS.SUMMON_RELEASE, { entityId });
  }

  async healthCheck(): Promise<RpcResponse> {
    return this.call(RPC_METHODS.STATUS_HEALTH);
  }

  async getStatus(): Promise<RpcResponse> {
    return this.call(RPC_METHODS.STATUS_INFO);
  }

  // ── Internal ──

  private handleMessage(data: WebSocket.RawData): void {
    try {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;

      // RPC Response
      if (msg.id && (msg.result !== undefined || msg.error !== undefined)) {
        const pending = this.pendingRequests.get(msg.id as string);
        if (pending) {
          this.pendingRequests.delete(msg.id as string);
          pending.resolve(msg as unknown as RpcResponse);
        }
        return;
      }

      // RPC Event
      if (msg.event) {
        const event = msg as unknown as RpcEvent;

        if (event.event === RPC_EVENTS.TOKEN && event.requestId) {
          const pending = this.pendingRequests.get(event.requestId);
          if (pending?.onToken) {
            const tokenData = event.data as { token: string };
            pending.onToken(tokenData.token);
          }
        } else if (event.event === RPC_EVENTS.DONE && event.requestId) {
          const pending = this.pendingRequests.get(event.requestId);
          if (pending?.onDone) {
            pending.onDone();
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.onStateChange?.(state);
  }

  private scheduleReconnect(): void {
    if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
      log.error(`Max reconnect attempts (${this.maxReconnectAttempts}) reached`);
      this.setState("disconnected");
      return;
    }

    this.setState("reconnecting");
    this.reconnectAttempts++;

    // Exponential backoff with jitter
    const delay = Math.min(
      this.reconnectBaseDelay * 2 ** (this.reconnectAttempts - 1) + Math.random() * 1000,
      this.reconnectMaxDelay,
    );

    log.info(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch {
        // connect() failure triggers ws.close -> scheduleReconnect again
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      try {
        await this.healthCheck();
      } catch (err) {
        log.warn(`Heartbeat failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private rejectAllPending(reason: string): void {
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error(reason));
      this.pendingRequests.delete(id);
    }
  }
}
