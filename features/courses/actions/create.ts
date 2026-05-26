'use server';

import { revalidatePath } from 'next/cache';

import {
  CreateCourseSchema,
  type CreateCourseInput,
} from '@/features/courses/schemas/course';
import { createCourse, SlugTakenError } from '@/features/courses/data/courses';
import { AuthError, requireRole } from '@/lib/auth';

type CreateCourseResult =
  | { ok: true; data: { id: string; slug: string } }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'SLUG_TAKEN' | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function createCourseAction(input: unknown): Promise<CreateCourseResult> {
  const parsed = CreateCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, error: e.code };
    }
    throw e;
  }

  try {
    const input: CreateCourseInput = parsed.data;
    const course = await createCourse({
      title: input.title,
      slug: input.slug,
      description: input.description ?? '',
      instructorId: user.id,
    });

    revalidatePath('/instructor/courses');
    return { ok: true, data: { id: course.id, slug: course.slug } };
  } catch (e) {
    if (e instanceof SlugTakenError) {
      return { ok: false, error: 'SLUG_TAKEN' };
    }
    console.error('[createCourseAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
