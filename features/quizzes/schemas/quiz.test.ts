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

describe('advanced quiz settings (timeLimitSec, maxAttempts, shuffleChoices)', () => {
  it('default to null/null/false', () => {
    const result = CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timeLimitSec).toBeNull();
      expect(result.data.maxAttempts).toBeNull();
      expect(result.data.shuffleChoices).toBe(false);
    }
  });

  it('accepts in-range values', () => {
    expect(
      CreateQuizSchema.safeParse({
        lessonId: 'l1',
        title: 'q',
        timeLimitSec: 600,
        maxAttempts: 3,
        shuffleChoices: true,
      }).success,
    ).toBe(true);
  });

  it('rejects timeLimitSec below 30 or above 14400', () => {
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', timeLimitSec: 5 }).success,
    ).toBe(false);
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', timeLimitSec: 99999 }).success,
    ).toBe(false);
  });

  it('rejects maxAttempts below 1 or above 50', () => {
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', maxAttempts: 0 }).success,
    ).toBe(false);
    expect(
      CreateQuizSchema.safeParse({ lessonId: 'l1', title: 'q', maxAttempts: 51 }).success,
    ).toBe(false);
  });

  it('accepts null for both numeric limits (means "no limit")', () => {
    expect(
      CreateQuizSchema.safeParse({
        lessonId: 'l1',
        title: 'q',
        timeLimitSec: null,
        maxAttempts: null,
      }).success,
    ).toBe(true);
  });
});
