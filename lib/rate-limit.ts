/**
 * In-memory sliding-window rate limiter.
 *
 * Design goals:
 * - async signature so the implementation can be swapped for Redis without
 *   changing call sites.
 * - Module-level singleton stored on globalThis so that Next.js HMR does not
 *   create multiple stores during development (mirrors the lib/db.ts pattern).
 * - No external dependencies; pure in-process Map of timestamp arrays.
 * - Memory-leak mitigation: stale timestamps are pruned on every check for the
 *   given key. Empty entries are deleted from the store. A MAX_KEYS cap causes
 *   new unknown keys to be blocked when the store is full (fail-closed).
 *
 * NOTE: For production deployments replace this store with Redis (e.g. ioredis
 * + sliding-window Lua script) so limits are enforced across multiple instances.
 */

export type RateLimitOptions = {
  /** Unique bucket identifier, e.g. "signin:user@example.com:1.2.3.4" */
  key: string;
  /** Maximum number of requests allowed inside the window */
  limit: number;
  /** Rolling window duration in milliseconds */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true; remaining: number; retryAfterMs: 0 }
  | { allowed: false; remaining: 0; retryAfterMs: number };

// ---------------------------------------------------------------------------
// Internal store — a Map of key → sorted array of request timestamps (ms)
// ---------------------------------------------------------------------------

/**
 * Maximum number of distinct keys the store may hold at any time.
 * When this cap is reached, new (unseen) keys are denied immediately so that a
 * flood of unique keys cannot exhaust server memory (fail-closed).
 */
const MAX_KEYS = 100_000;

type RateLimitStore = Map<string, number[]>;

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore: RateLimitStore | undefined;
};

function getStore(): RateLimitStore {
  if (!globalForRateLimit.__rateLimitStore) {
    globalForRateLimit.__rateLimitStore = new Map<string, number[]>();
  }
  return globalForRateLimit.__rateLimitStore;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether `key` is within its rate limit.
 *
 * If allowed, the current timestamp is recorded and the updated `remaining`
 * count is returned. If denied, the timestamp is NOT recorded and
 * `retryAfterMs` indicates how long the caller should wait before the oldest
 * in-window request expires.
 */
export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const store = getStore();
  const now = Date.now();
  const windowStart = now - windowMs;

  // Retrieve and prune timestamps that have fallen outside the window.
  const existing = store.get(key);
  const timestamps = (existing ?? []).filter((ts) => ts > windowStart);

  // If pruning emptied a previously-existing entry, remove it from the store
  // immediately to prevent accumulation of zero-length entries.
  if (existing !== undefined && timestamps.length === 0) {
    store.delete(key);
  }

  if (timestamps.length >= limit) {
    // The oldest timestamp in the (already-pruned) window determines when the
    // first slot will free up.
    const oldest = timestamps[0];
    // oldest is guaranteed to exist because timestamps.length >= limit >= 1
    const retryAfterMs = oldest! + windowMs - now;
    // Write back the pruned (but otherwise unchanged) array.
    store.set(key, timestamps);
    return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1) };
  }

  // Guard against memory-exhaustion DoS: if the store is already at the cap
  // and this is a brand-new key, deny the request (fail-closed).
  const isNewKey = !store.has(key);
  if (isNewKey && store.size >= MAX_KEYS) {
    return { allowed: false, remaining: 0, retryAfterMs: windowMs };
  }

  // Record this request.
  timestamps.push(now);
  store.set(key, timestamps);

  return { allowed: true, remaining: limit - timestamps.length, retryAfterMs: 0 };
}

// ---------------------------------------------------------------------------
// Test helper — exported but intentionally not part of the public contract
// ---------------------------------------------------------------------------

/**
 * Reset the in-memory store. **Only for use in unit tests.**
 */
export function __resetRateLimitStore(): void {
  const store = getStore();
  store.clear();
}

/**
 * Return the current number of keys in the store. **Only for use in unit tests.**
 */
export function __getRateLimitStoreSize(): number {
  return getStore().size;
}

/**
 * Fill the store with `count` synthetic keys. **Only for use in unit tests.**
 * Allows tests to simulate a full store without calling checkRateLimit N times.
 */
export function __fillRateLimitStore(count: number): void {
  const store = getStore();
  store.clear();
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    store.set(`__fill__${i}`, [now]);
  }
}
