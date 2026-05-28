import { describe, expect, it } from 'vitest';
import { shuffleDeterministic } from './shuffle';

describe('shuffleDeterministic', () => {
  it('produces the same order for the same seed', () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffleDeterministic(items, 'seed-A')).toEqual(
      shuffleDeterministic(items, 'seed-A'),
    );
  });
  it('produces different orders for different seeds', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const a = shuffleDeterministic(items, 'seed-A');
    const b = shuffleDeterministic(items, 'seed-B');
    expect(a).not.toEqual(b);
  });
  it('does not mutate the input', () => {
    const items = [1, 2, 3];
    const copy = items.slice();
    shuffleDeterministic(items, 'x');
    expect(items).toEqual(copy);
  });
  it('preserves elements (same multiset)', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(shuffleDeterministic(items, 'k').sort()).toEqual(items.slice().sort());
  });
});
