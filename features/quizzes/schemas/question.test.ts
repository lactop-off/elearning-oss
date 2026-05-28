import { describe, expect, it } from 'vitest';
import { AddQuestionSchema, ReorderQuestionsSchema } from './question';

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

describe('AddQuestionSchema (TEXT)', () => {
  function basePayload() {
    return {
      type: 'TEXT' as const,
      quizId: 'q1',
      body: 'Explain why 2 is the only even prime.',
      points: 5,
    };
  }

  it('accepts a TEXT question without a model answer', () => {
    expect(AddQuestionSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('accepts a TEXT question with an optional model answer', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        modelAnswer: 'Any other even number is divisible by 2.',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty question body', () => {
    expect(
      AddQuestionSchema.safeParse({ ...basePayload(), body: '' }).success,
    ).toBe(false);
  });

  it('rejects a model answer over 2000 characters', () => {
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        modelAnswer: 'x'.repeat(2001),
      }).success,
    ).toBe(false);
  });

  it('ignores choice fields supplied for a TEXT type (discriminated union)', () => {
    // The TEXT branch does not declare `choices`; extra fields are stripped or
    // ignored. Either way, the result must validate.
    expect(
      AddQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'spurious' }, { body: 'extras' }],
      }).success,
    ).toBe(true);
  });
});

describe('ReorderQuestionsSchema', () => {
  it('accepts a non-empty ordered list', () => {
    expect(
      ReorderQuestionsSchema.safeParse({
        quizId: 'q1',
        orderedQuestionIds: ['qq1', 'qq2'],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty list', () => {
    expect(
      ReorderQuestionsSchema.safeParse({ quizId: 'q1', orderedQuestionIds: [] }).success,
    ).toBe(false);
  });

  it('rejects duplicate questionIds', () => {
    expect(
      ReorderQuestionsSchema.safeParse({
        quizId: 'q1',
        orderedQuestionIds: ['qq1', 'qq2', 'qq1'],
      }).success,
    ).toBe(false);
  });

  it('rejects empty quizId', () => {
    expect(
      ReorderQuestionsSchema.safeParse({ quizId: '', orderedQuestionIds: ['qq1'] }).success,
    ).toBe(false);
  });
});
