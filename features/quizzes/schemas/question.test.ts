import { describe, expect, it } from 'vitest';
import { AddSingleChoiceQuestionSchema } from './question';

describe('AddSingleChoiceQuestionSchema', () => {
  function basePayload() {
    return {
      quizId: 'q1',
      body: 'What is 1+1?',
      choices: [{ body: '2' }, { body: '3' }],
      correctChoiceIndex: 0,
    };
  }

  it('accepts a valid 2-choice question', () => {
    expect(AddSingleChoiceQuestionSchema.safeParse(basePayload()).success).toBe(true);
  });

  it('rejects fewer than 2 choices', () => {
    expect(
      AddSingleChoiceQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'only one' }],
      }).success,
    ).toBe(false);
  });

  it('rejects more than 6 choices', () => {
    expect(
      AddSingleChoiceQuestionSchema.safeParse({
        ...basePayload(),
        choices: Array.from({ length: 7 }, (_, i) => ({ body: `c${i}` })),
      }).success,
    ).toBe(false);
  });

  it('rejects empty choice body', () => {
    expect(
      AddSingleChoiceQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: '' }, { body: 'b' }],
      }).success,
    ).toBe(false);
  });

  it('rejects correctChoiceIndex out of range for choices length', () => {
    expect(
      AddSingleChoiceQuestionSchema.safeParse({
        ...basePayload(),
        choices: [{ body: 'a' }, { body: 'b' }],
        correctChoiceIndex: 2,
      }).success,
    ).toBe(false);
  });
});
