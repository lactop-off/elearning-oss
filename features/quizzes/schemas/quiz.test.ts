import { describe, expect, it } from 'vitest';
import { CreateQuizSchema, UpdateQuizSchema } from './quiz';

describe('CreateQuizSchema', () => {
  it('accepts a minimal payload and applies defaults', () => {
    const result = CreateQuizSchema.safeParse({
      lessonId: 'l1',
      title: 'Mid-course check',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('');
      expect(result.data.passingScore).toBe(70);
      expect(result.data.isRequired).toBe(true);
    }
  });

  it('rejects an empty title', () => {
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: '' }).success,
    ).toBe(false);
  });

  it('rejects passingScore out of [0,100]', () => {
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', passingScore: 101 }).success,
    ).toBe(false);
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', passingScore: -1 }).success,
    ).toBe(false);
  });
});

describe('UpdateQuizSchema', () => {
  it('accepts a complete update payload', () => {
    const result = UpdateQuizSchema.safeParse({
      quizId: 'q1',
      title: 'Updated quiz',
      description: 'New desc',
      passingScore: 80,
      isRequired: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty quizId', () => {
    expect(
      UpdateQuizSchema.safeParse({ quizId: '', title: 'q' }).success,
    ).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(
      UpdateQuizSchema.safeParse({ quizId: 'q1', title: '' }).success,
    ).toBe(false);
  });

  it('rejects passingScore out of [0,100]', () => {
    expect(
      UpdateQuizSchema.safeParse({ quizId: 'q1', title: 'q', passingScore: 150 }).success,
    ).toBe(false);
  });
});
