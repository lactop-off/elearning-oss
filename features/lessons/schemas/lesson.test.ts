import { describe, expect, it } from 'vitest';
import { CreateLessonSchema } from './lesson';

describe('CreateLessonSchema', () => {
  it('accepts a complete payload', () => {
    const result = CreateLessonSchema.safeParse({
      courseId: 'cuid-1',
      title: 'Intro',
      content: 'Hello world',
      isRequired: true,
    });
    expect(result.success).toBe(true);
  });

  it('defaults content to empty string and isRequired to true', () => {
    const result = CreateLessonSchema.safeParse({ courseId: 'cuid-1', title: 'Intro' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe('');
      expect(result.data.isRequired).toBe(true);
    }
  });

  it('rejects empty title', () => {
    expect(
      CreateLessonSchema.safeParse({ courseId: 'cuid-1', title: '' }).success,
    ).toBe(false);
  });

  it('rejects empty courseId', () => {
    expect(
      CreateLessonSchema.safeParse({ courseId: '', title: 'Intro' }).success,
    ).toBe(false);
  });

  it('rejects content larger than the limit', () => {
    expect(
      CreateLessonSchema.safeParse({
        courseId: 'cuid-1',
        title: 'Intro',
        content: 'x'.repeat(20001),
      }).success,
    ).toBe(false);
  });
});
