/**
 * Deterministic Fisher-Yates shuffle. Two calls with the same `seed`
 * produce the same permutation, so a learner sees the same choice order
 * for the duration of an attempt (seed = attemptId-questionId is a good
 * pairing). Not cryptographically secure — only used for choice ordering.
 */
export function shuffleDeterministic<T>(items: readonly T[], seed: string): T[] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let s = h;
  function next(): number {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  }
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = next() % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
