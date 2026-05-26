import { describe, expect, it } from 'vitest';
import { SubmitAttemptSchema } from './attempt';

describe('SubmitAttemptSchema', () => {
  it('accepts single-choice answers (one choiceId each)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [
          { questionId: 'q1', choiceIds: ['c1'] },
          { questionId: 'q2', choiceIds: ['c5'] },
        ],
      }).success,
    ).toBe(true);
  });

  it('accepts multi-choice answers (multiple choiceIds)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: ['c1', 'c2', 'c4'] }],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty answers array', () => {
    expect(SubmitAttemptSchema.safeParse({ attemptId: 'a1', answers: [] }).success).toBe(
      false,
    );
  });

  it('rejects an answer with no choiceIds', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: [] }],
      }).success,
    ).toBe(false);
  });

  it('rejects empty ids', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: '',
        answers: [{ questionId: 'q1', choiceIds: ['c1'] }],
      }).success,
    ).toBe(false);
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: '', choiceIds: ['c1'] }],
      }).success,
    ).toBe(false);
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: [''] }],
      }).success,
    ).toBe(false);
  });
});
