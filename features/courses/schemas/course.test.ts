import { describe, expect, it } from 'vitest';
import { CreateCourseSchema } from './course';

describe('CreateCourseSchema', () => {
  it('accepts a complete, valid payload', () => {
    const result = CreateCourseSchema.safeParse({
      title: 'Intro to TypeScript',
      slug: 'intro-to-typescript',
      description: 'A friendly introduction.',
    });
    expect(result.success).toBe(true);
  });

  it('treats description as optional and defaults it to an empty string', () => {
    const result = CreateCourseSchema.safeParse({
      title: 'Intro',
      slug: 'intro',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBe('');
  });

  it('rejects an empty title', () => {
    const result = CreateCourseSchema.safeParse({
      title: '',
      slug: 'intro',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug shorter than 3 characters', () => {
    const result = CreateCourseSchema.safeParse({
      title: 'Intro',
      slug: 'ab',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug that contains uppercase or spaces', () => {
    expect(
      CreateCourseSchema.safeParse({ title: 'Intro', slug: 'Intro' }).success,
    ).toBe(false);
    expect(
      CreateCourseSchema.safeParse({ title: 'Intro', slug: 'intro to ts' }).success,
    ).toBe(false);
  });

  it('rejects descriptions longer than the maximum', () => {
    const result = CreateCourseSchema.safeParse({
      title: 'Intro',
      slug: 'intro',
      description: 'x'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
