/**
 * Inlined RPC protocol types from @openoctopus/shared.
 * Kept minimal — only what reef-bot needs for WS RPC communication.
 */

export interface RpcRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface RpcResponse {
  id: string;
  result?: unknown;
  error?: { code: number; message: string };
}

export interface RpcEvent {
  event: string;
  requestId?: string;
  data: unknown;
}

export const RPC_METHODS = {
  CHAT_SEND: "chat.send",
  REALM_LIST: "realm.list",
  REALM_GET: "realm.get",
  ENTITY_LIST: "entity.list",
  ENTITY_GET: "entity.get",
  ENTITY_CREATE: "entity.create",
  SUMMON_INVOKE: "summon.invoke",
  SUMMON_RELEASE: "summon.release",
  SUMMON_LIST: "summon.list",
  STATUS_HEALTH: "status.health",
  STATUS_INFO: "status.info",
} as const;

export const RPC_EVENTS = {
  TOKEN: "chat.token",
  DONE: "chat.done",
  ERROR: "error",
} as const;

export function createRpcRequest(method: string, params?: Record<string, unknown>): RpcRequest {
  return {
    id: `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    method,
    params: params ?? {},
  };
}
