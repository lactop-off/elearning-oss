'use server';

import { revalidatePath } from 'next/cache';

import { findCourseOwnedBy } from '@/features/courses/data/courses';
import { reorderLessons } from '@/features/lessons/data/lessons';
import { ReorderLessonsSchema } from '@/features/lessons/schemas/lesson';
import { AuthError, requireRole } from '@/lib/auth';

type ReorderLessonsResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'COURSE_NOT_FOUND'
        | 'SET_MISMATCH'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function reorderLessonsAction(input: unknown): Promise<ReorderLessonsResult> {
  const parsed = ReorderLessonsSchema.safeParse(input);
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

  // Verify the client-supplied courseId is owned by the instructor before
  // letting any reorder happen — reorderLessons trusts its caller for this.
  const course = await findCourseOwnedBy(parsed.data.courseId, user.id);
  if (!course) return { ok: false, error: 'COURSE_NOT_FOUND' };

  try {
    const outcome = await reorderLessons(parsed.data.courseId, parsed.data.orderedLessonIds);
    if (!outcome.ok) return { ok: false, error: outcome.reason };
    revalidatePath(`/instructor/courses/${course.slug}`);
    revalidatePath(`/learn/${course.slug}`);
    return { ok: true };
  } catch (e) {
    console.error('[reorderLessonsAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
