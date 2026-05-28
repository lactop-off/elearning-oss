import { describe, expect, it } from 'vitest';
import { CreateLessonSchema, ReorderLessonsSchema, UpdateLessonSchema } from './lesson';

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

describe('UpdateLessonSchema', () => {
  it('accepts a complete update payload', () => {
    const result = UpdateLessonSchema.safeParse({
      lessonId: 'l1',
      title: 'New title',
      content: 'New body',
      isRequired: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty lessonId', () => {
    expect(
      UpdateLessonSchema.safeParse({ lessonId: '', title: 'x' }).success,
    ).toBe(false);
  });

  it('rejects an empty title', () => {
    expect(
      UpdateLessonSchema.safeParse({ lessonId: 'l1', title: '' }).success,
    ).toBe(false);
  });
});

describe('ReorderLessonsSchema', () => {
  it('accepts a non-empty ordered list', () => {
    expect(
      ReorderLessonsSchema.safeParse({
        courseId: 'c1',
        orderedLessonIds: ['l1', 'l2', 'l3'],
      }).success,
    ).toBe(true);
  });

  it('rejects an empty list', () => {
    expect(
      ReorderLessonsSchema.safeParse({ courseId: 'c1', orderedLessonIds: [] }).success,
    ).toBe(false);
  });

  it('rejects duplicate lessonIds', () => {
    expect(
      ReorderLessonsSchema.safeParse({
        courseId: 'c1',
        orderedLessonIds: ['l1', 'l2', 'l1'],
      }).success,
    ).toBe(false);
  });

  it('rejects empty courseId', () => {
    expect(
      ReorderLessonsSchema.safeParse({ courseId: '', orderedLessonIds: ['l1'] }).success,
    ).toBe(false);
  });
});
