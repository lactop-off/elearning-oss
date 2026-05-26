'use server';

import { revalidatePath } from 'next/cache';

import { findCourseOwnedBy } from '@/features/courses/data/courses';
import { createLesson } from '@/features/lessons/data/lessons';
import {
  CreateLessonSchema,
  type CreateLessonInput,
} from '@/features/lessons/schemas/lesson';
import { AuthError, requireRole } from '@/lib/auth';

type CreateLessonResult =
  | { ok: true; data: { id: string; order: number } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'COURSE_NOT_FOUND'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function createLessonAction(input: unknown): Promise<CreateLessonResult> {
  const parsed = CreateLessonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  const course = await findCourseOwnedBy(parsed.data.courseId, user.id);
  if (!course) return { ok: false, error: 'COURSE_NOT_FOUND' };

  try {
    const data: CreateLessonInput = parsed.data;
    const lesson = await createLesson({
      courseId: course.id,
      title: data.title,
      content: data.content,
      isRequired: data.isRequired,
    });
    revalidatePath(`/instructor/courses/${course.slug}`);
    return { ok: true, data: { id: lesson.id, order: lesson.order } };
  } catch (e) {
    console.error('[createLessonAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
