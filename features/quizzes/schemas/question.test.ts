import { describe, expect, it } from 'vitest';
import { AddQuestionSchema } from './question';

describe('AddQuestionSchema (SINGLE_CHOICE)', () => {
  function basePayload() {
    return {
      type: 'SINGLE_CHOICE' as const,
      quizId: 'q1',
      body: 'What is 1+1?',
      choices: [{ body: '2' }, { body: '3' }],
      correctChoiceIndex: 0,
    };
  }

  it('accepts a valid 2-choice single question', () => {
    expect(AddQuestionSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('rejects fewer than 2 choices', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'only one' }],
      }).success,
    ).toBe(false);
  });

  it('rejects more than 6 choices', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: Array.from({ length: 7 }, (_, i) => ({ body: `c${i}` })),
      }).success,
    ).toBe(false);
  });

  it('rejects empty choice body', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: '' }, { body: 'b' }],
      }).success,
    ).toBe(false);
  });

  it('rejects correctChoiceIndex out of range for choices length', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'a' }, { body: 'b' }],
        correctChoiceIndex: 2,
      }).success,
    ).toBe(false);
  });
});

describe('AddQuestionSchema (MULTI_CHOICE)', () => {
  function basePayload() {
    return {
      type: 'MULTI_CHOICE' as const,
      quizId: 'q1',
      body: 'Pick prime numbers',
      choices: [{ body: '2' }, { body: '3' }, { body: '4' }, { body: '5' }],
      correctChoiceIndices: [0, 1, 3],
    };
  }

  it('accepts a valid multi-choice with 3 of 4 correct', () => {
    expect(AddQuestionSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('requires at least one correct choice', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        correctChoiceIndices: [],
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate indices', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        correctChoiceIndices: [0, 0, 1],
      }).success,
    ).toBe(false);
  });

  it('rejects indices pointing past the choice list', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        correctChoiceIndices: [0, 5], // only 4 choices
      }).success,
    ).toBe(false);
  });

  it('rejects every-choice-correct (degenerate case)', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'a' }, { body: 'b' }],
        correctChoiceIndices: [0, 1],
      }).success,
    ).toBe(false);
  });
});
