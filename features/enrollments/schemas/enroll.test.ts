import { describe, expect, it } from 'vitest';
import { EnrollSchema } from './enroll';

describe('EnrollSchema', () => {
  it('accepts a valid courseId', () => {
    expect(EnrollSchema.safeParse({ courseId: 'abc' }).success).toBe(true);
  });

  it('rejects an empty courseId', () => {
    expect(EnrollSchema.safeParse({ courseId: '' }).success).toBe(false);
  });

  it('rejects a missing courseId', () => {
    expect(EnrollSchema.safeParse({}).success).toBe(false);
  });
});
