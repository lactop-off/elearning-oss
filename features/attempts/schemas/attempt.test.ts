import { describe, expect, it } from 'vitest';
import { SubmitAttemptSchema } from './attempt';

describe('SubmitAttemptSchema', () => {
  it('accepts a valid payload', () => {
    const result = SubmitAttemptSchema.safeParse({
      attemptId: 'a1',
      answers: [
        { questionId: 'q1', choiceId: 'c1' },
        { questionId: 'q2', choiceId: 'c5' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty answers array', () => {
    expect(
      SubmitAttemptSchema.safeParse({ attemptId: 'a1', answers: [] }).success,
    ).toBe(false);
  });

  it('rejects empty ids', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: '',
        answers: [{ questionId: 'q1', choiceId: 'c1' }],
      }).success,
    ).toBe(false);
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: '', choiceId: 'c1' }],
      }).success,
    ).toBe(false);
  });
});
