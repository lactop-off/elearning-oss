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

  it('accepts a text answer', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [
          {
            questionId: 'q1',
            textAnswer: 'Because 2 has no other divisors except 1 and itself.',
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('accepts a mix of choice and text answers in one submission', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [
          { questionId: 'q1', choiceIds: ['c1'] },
          { questionId: 'q2', textAnswer: 'long answer' },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects an answer that supplies both choiceIds and textAnswer', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [
          { questionId: 'q1', choiceIds: ['c1'], textAnswer: 'oops both' },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects an answer that supplies neither choiceIds nor textAnswer', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1' }],
      }).success,
    ).toBe(false);
  });

  it('rejects an empty text answer', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a text answer over 5000 characters', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: 'x'.repeat(5001) }],
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
