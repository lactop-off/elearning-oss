import { describe, expect, it } from 'vitest';
import { GradeAttemptSchema } from './grade';

describe('GradeAttemptSchema', () => {
  function basePayload() {
    return {
      attemptId: 'attempt-1',
      grades: [{ questionId: 'q1', pointsAwarded: 5 }],
    };
  }

  it('accepts a valid payload with one grade entry', () => {
    expect(GradeAttemptSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('accepts pointsAwarded = 0 (minimum boundary)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: 0 }],
      }).success,
    ).toBe(true);
  });

  it('accepts pointsAwarded = 100 (maximum boundary)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: 100 }],
      }).success,
    ).toBe(true);
  });

  it('accepts multiple grade entries', () => {
    expect(
      GradeAttemptSchema.safeParse({
        attemptId: 'attempt-1',
        grades: [
          { questionId: 'q1', pointsAwarded: 10 },
          { questionId: 'q2', pointsAwarded: 0 },
          { questionId: 'q3', pointsAwarded: 100 },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty grades array', () => {
    expect(GradeAttemptSchema.safeParse({ attemptId: 'attempt-1', grades: [] }).success).toBe(
      false,
    );
  });

  it('rejects pointsAwarded = -1 (below minimum)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: -1 }],
      }).success,
    ).toBe(false);
  });

  it('rejects pointsAwarded = 101 (above maximum)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: 101 }],
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer pointsAwarded (e.g. 5.5)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: 5.5 }],
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer pointsAwarded (e.g. 0.1)', () => {
    expect(
      GradeAttemptSchema.safeParse({
        ...basePayload(),
        grades: [{ questionId: 'q1', pointsAwarded: 0.1 }],
      }).success,
    ).toBe(false);
  });

  it('rejects an empty attemptId', () => {
    expect(GradeAttemptSchema.safeParse({ ...basePayload(), attemptId: '' }).success).toBe(false);
  });

  it('rejects an empty questionId within grades', () => {
    expect(
      GradeAttemptSchema.safeParse({
        attemptId: 'attempt-1',
        grades: [{ questionId: '', pointsAwarded: 5 }],
      }).success,
    ).toBe(false);
  });

  it('rejects missing attemptId', () => {
    expect(
      GradeAttemptSchema.safeParse({ grades: [{ questionId: 'q1', pointsAwarded: 5 }] }).success,
    ).toBe(false);
  });

  it('rejects missing grades field', () => {
    expect(GradeAttemptSchema.safeParse({ attemptId: 'attempt-1' }).success).toBe(false);
  });
});
