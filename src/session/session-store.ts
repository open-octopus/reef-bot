/**
 * In-memory session store for mapping Discord contexts to gateway session IDs.
 *
 * Key strategy:
 * - DM: `dm:{userId}`
 * - Channel: `ch:{channelId}:{userId}`
 * - Thread: `th:{threadId}:{userId}`
 *
 * Sessions are lost on restart (acceptable for community bot).
 */

export interface Session {
  sessionId: string;
  userId: string;
  channelId: string;
  createdAt: number;
  lastActiveAt: number;
}

export class SessionStore {
  private sessions = new Map<string, Session>();
  private maxAge: number;

  /** @param maxAge Session TTL in ms. Default: 1 hour. */
  constructor(maxAge = 60 * 60 * 1000) {
    this.maxAge = maxAge;
  }

  /** Build session key from Discord context */
  static key(opts: { isDM: boolean; channelId: string; userId: string; threadId?: string }): string {
    if (opts.threadId) return `th:${opts.threadId}:${opts.userId}`;
    if (opts.isDM) return `dm:${opts.userId}`;
    return `ch:${opts.channelId}:${opts.userId}`;
  }

  /** Get or create a session. Returns the gateway session ID. */
  getOrCreate(key: string, userId: string, channelId: string): string {
    const existing = this.sessions.get(key);
    if (existing && Date.now() - existing.lastActiveAt < this.maxAge) {
      existing.lastActiveAt = Date.now();
      return existing.sessionId;
    }

    // Create new session — generate a unique ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.sessions.set(key, {
      sessionId,
      userId,
      channelId,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    });
    return sessionId;
  }

  /** Get existing session (without creating) */
  get(key: string): Session | undefined {
    const session = this.sessions.get(key);
    if (session && Date.now() - session.lastActiveAt < this.maxAge) {
      return session;
    }
    if (session) {
      this.sessions.delete(key);
    }
    return undefined;
  }

  /** Remove a session */
  delete(key: string): void {
    this.sessions.delete(key);
  }

  /** Clean up expired sessions */
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, session] of this.sessions) {
      if (now - session.lastActiveAt >= this.maxAge) {
        this.sessions.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  /** Number of active sessions */
  get size(): number {
    return this.sessions.size;
  }

  /** Clear all sessions */
  clear(): void {
    this.sessions.clear();
  }
}
