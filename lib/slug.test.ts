import { describe, expect, it } from 'vitest';
import { isValidSlug, slugify } from './slug';

describe('slugify', () => {
  it('converts a normal title', () => {
    expect(slugify('Introduction to TypeScript')).toBe('introduction-to-typescript');
  });

  it('strips punctuation and special characters', () => {
    expect(slugify('Hello, World! (1.0)')).toBe('hello-world-1-0');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('   Hello   ')).toBe('hello');
    expect(slugify('---a---')).toBe('a');
  });

  it('returns empty for input that contains no slug-safe characters', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('handles unicode by stripping non-ascii after normalize', () => {
    expect(slugify('Café')).toBe('cafe');
  });
});

describe('isValidSlug', () => {
  it('accepts kebab-case ascii', () => {
    expect(isValidSlug('intro-to-ts')).toBe(true);
    expect(isValidSlug('a')).toBe(true);
    expect(isValidSlug('a1')).toBe(true);
  });

  it('rejects empty, leading/trailing dashes, and uppercase', () => {
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug('-a')).toBe(false);
    expect(isValidSlug('a-')).toBe(false);
    expect(isValidSlug('Hello')).toBe(false);
    expect(isValidSlug('a b')).toBe(false);
  });
});
