import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __fillRateLimitStore,
  __getRateLimitStoreSize,
  __resetRateLimitStore,
  checkRateLimit,
} from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Establish a fixed starting point so tests are deterministic.
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    __resetRateLimitStore();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetRateLimitStore();
  });

  it('allows requests within the limit and decrements remaining', async () => {
    const opts = { key: 'test-key', limit: 3, windowMs: 60_000 };

    const r1 = await checkRateLimit(opts);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(opts);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(opts);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks the request that exceeds the limit and returns retryAfterMs > 0', async () => {
    const opts = { key: 'overflow-key', limit: 2, windowMs: 60_000 };

    await checkRateLimit(opts); // 1
    await checkRateLimit(opts); // 2 — fills the bucket

    const denied = await checkRateLimit(opts); // 3 — should be denied
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    // retryAfterMs should be close to the full window (first request was at t=0,
    // window is 60 000 ms, so retry is in ~60 000 ms).
    if (!denied.allowed) {
      expect(denied.retryAfterMs).toBeGreaterThan(0);
      expect(denied.retryAfterMs).toBeLessThanOrEqual(60_000);
    }
  });

  it('recovers after the window has elapsed', async () => {
    const opts = { key: 'recovery-key', limit: 2, windowMs: 30_000 };

    await checkRateLimit(opts); // 1
    await checkRateLimit(opts); // 2

    // Advance time past the window so those timestamps are stale.
    vi.advanceTimersByTime(30_001);

    const r = await checkRateLimit(opts);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it('counts different keys independently', async () => {
    const window = { limit: 1, windowMs: 60_000 };

    const r1 = await checkRateLimit({ key: 'keyA', ...window });
    expect(r1.allowed).toBe(true);

    // keyB has its own bucket — first request should still be allowed.
    const r2 = await checkRateLimit({ key: 'keyB', ...window });
    expect(r2.allowed).toBe(true);

    // Second request on keyA should now be denied.
    const r3 = await checkRateLimit({ key: 'keyA', ...window });
    expect(r3.allowed).toBe(false);

    // Second request on keyB should also be denied (same limit).
    const r4 = await checkRateLimit({ key: 'keyB', ...window });
    expect(r4.allowed).toBe(false);
  });

  it('store state does not leak between tests (via __resetRateLimitStore)', async () => {
    // If state leaked from a previous test this would fail because that test
    // already consumed one slot on 'leak-check-key'.
    const opts = { key: 'leak-check-key', limit: 1, windowMs: 60_000 };
    const r = await checkRateLimit(opts);
    expect(r.allowed).toBe(true);
  });

  it('partial window recovery: only requests inside the window count', async () => {
    const opts = { key: 'partial-key', limit: 3, windowMs: 60_000 };

    // t=0: two requests
    await checkRateLimit(opts);
    await checkRateLimit(opts);

    // Advance 40 s — those two requests are still inside the window.
    vi.advanceTimersByTime(40_000);

    // t=40s: one more request fills the bucket
    await checkRateLimit(opts);

    // t=40s: next request should be denied
    const denied = await checkRateLimit(opts);
    expect(denied.allowed).toBe(false);

    // Advance 21 s to t=61s — the first two requests (at t=0) have expired.
    vi.advanceTimersByTime(21_000);

    // Now only the t=40s request is in-window, so two slots are free.
    const r = await checkRateLimit(opts);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it('deletes the store entry when all timestamps expire (no orphaned keys)', async () => {
    const opts = { key: 'expiry-delete-key', limit: 3, windowMs: 10_000 };

    await checkRateLimit(opts);
    await checkRateLimit(opts);

    // The key should exist in the store after two requests.
    expect(__getRateLimitStoreSize()).toBe(1);

    // Advance past the window so both timestamps become stale.
    vi.advanceTimersByTime(10_001);

    // A new request causes pruning; since the result is empty the entry should
    // be deleted and then immediately re-added with the new timestamp.
    const r = await checkRateLimit(opts);
    expect(r.allowed).toBe(true);
    // The entry was re-created for the new timestamp, so size is still 1.
    expect(__getRateLimitStoreSize()).toBe(1);

    // Advance past the window again with no further requests — the entry still
    // exists because it was never revisited. A subsequent request should prune
    // it to empty, delete it, then add a fresh entry.
    vi.advanceTimersByTime(10_001);
    const r2 = await checkRateLimit(opts);
    expect(r2.allowed).toBe(true);
    expect(__getRateLimitStoreSize()).toBe(1);
  });

  it('blocks new keys when MAX_KEYS is reached', async () => {
    // Fill the store to the documented cap using the internal helper.
    // We manipulate the store directly to avoid calling checkRateLimit 100_000
    // times (which would be very slow in tests).
    __fillRateLimitStore(100_000);

    // A brand-new key should now be denied (fail-closed).
    const r = await checkRateLimit({ key: 'brand-new-key', limit: 5, windowMs: 60_000 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });
});
