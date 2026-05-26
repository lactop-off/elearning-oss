import { describe, expect, it } from 'vitest';
import { MarkCompleteSchema } from './progress';

describe('MarkCompleteSchema', () => {
  it('accepts both ids', () => {
    expect(
      MarkCompleteSchema.safeParse({ enrollmentId: 'e1', lessonId: 'l1' }).success,
    ).toBe(true);
  });

  it('rejects an empty enrollmentId', () => {
    expect(
      MarkCompleteSchema.safeParse({ enrollmentId: '', lessonId: 'l1' }).success,
    ).toBe(false);
  });

  it('rejects an empty lessonId', () => {
    expect(
      MarkCompleteSchema.safeParse({ enrollmentId: 'e1', lessonId: '' }).success,
    ).toBe(false);
  });
});
