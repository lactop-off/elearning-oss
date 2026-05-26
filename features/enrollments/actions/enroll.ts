'use server';

import { revalidatePath } from 'next/cache';

import { findPublishedCourseById } from '@/features/courses/data/courses';
import {
  AlreadyEnrolledError,
  createEnrollment,
} from '@/features/enrollments/data/enrollments';
import { EnrollSchema } from '@/features/enrollments/schemas/enroll';
import { AuthError, requireUser } from '@/lib/auth';

type EnrollResult =
  | { ok: true; data: { enrollmentId: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'COURSE_NOT_PUBLISHED'
        | 'ALREADY_ENROLLED'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function enrollAction(input: unknown): Promise<EnrollResult> {
  const parsed = EnrollSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError && e.code === 'UNAUTHORIZED') {
      return { ok: false, error: 'UNAUTHORIZED' };
    }
    throw e;
  }

  // Resolve the course via the data layer so we trust DB state, not the
  // client-supplied id, and guarantee the course is published.
  const course = await findPublishedCourseById(parsed.data.courseId);
  if (!course) return { ok: false, error: 'COURSE_NOT_PUBLISHED' };

  try {
    const enrollment = await createEnrollment(user.id, course.id);
    revalidatePath('/learn');
    revalidatePath(`/courses/${course.slug}`);
    return { ok: true, data: { enrollmentId: enrollment.id } };
  } catch (e) {
    if (e instanceof AlreadyEnrolledError) {
      return { ok: false, error: 'ALREADY_ENROLLED' };
    }
    console.error('[enrollAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
