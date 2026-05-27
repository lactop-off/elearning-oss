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
    expect(SubmitAttemptSchema.safeParse({ attemptId: 'a1', answers: [] }).success).toBe(false);
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

describe('SubmitAttemptSchema — TEXT answer support', () => {
  it('accepts a textAnswer-only answer (no choiceIds)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: 'Recursion is...' }],
      }).success,
    ).toBe(true);
  });

  it('accepts a choiceIds-only answer (no textAnswer)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: ['c1'] }],
      }).success,
    ).toBe(true);
  });

  it('accepts a mixed answers array with both choice and text answers', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [
          { questionId: 'q1', choiceIds: ['c1'] },
          { questionId: 'q2', textAnswer: 'My written answer' },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects an answer with both choiceIds and textAnswer', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: ['c1'], textAnswer: 'also text' }],
      }).success,
    ).toBe(false);
  });

  it('rejects an answer with neither choiceIds nor textAnswer (questionId only)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a textAnswer that is an empty string', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a textAnswer exceeding 5000 characters', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: 'a'.repeat(5001) }],
      }).success,
    ).toBe(false);
  });

  it('accepts a textAnswer of exactly 5000 characters (boundary)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', textAnswer: 'a'.repeat(5000) }],
      }).success,
    ).toBe(true);
  });

  it('rejects choiceIds with 7 entries (above maximum of 6)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'] }],
      }).success,
    ).toBe(false);
  });

  it('accepts choiceIds with exactly 6 entries (boundary)', () => {
    expect(
      SubmitAttemptSchema.safeParse({
        attemptId: 'a1',
        answers: [{ questionId: 'q1', choiceIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] }],
      }).success,
    ).toBe(true);
  });

  it('rejects answers array that is empty', () => {
    expect(SubmitAttemptSchema.safeParse({ attemptId: 'a1', answers: [] }).success).toBe(false);
  });
});
