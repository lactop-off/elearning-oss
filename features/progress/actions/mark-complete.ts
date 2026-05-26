'use server';

import { revalidatePath } from 'next/cache';

import { findLessonInEnrollment } from '@/features/lessons/data/lessons';
import {
  ProgressAlreadyRecordedError,
  recordProgress,
} from '@/features/progress/data/progress';
import { MarkCompleteSchema } from '@/features/progress/schemas/progress';
import { AuthError, requireUser } from '@/lib/auth';

type MarkCompleteResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'NOT_FOUND'
        | 'ALREADY_COMPLETED'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function markLessonCompleteAction(
  input: unknown,
): Promise<MarkCompleteResult> {
  const parsed = MarkCompleteSchema.safeParse(input);
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

  // Re-validate that the lesson actually belongs to a course this user is
  // enrolled in. Server side trust > client-supplied ids. The data layer keeps
  // Prisma access out of the action.
  const lesson = await findLessonInEnrollment(
    parsed.data.enrollmentId,
    user.id,
    parsed.data.lessonId,
  );
  if (!lesson) return { ok: false, error: 'NOT_FOUND' };

  try {
    await recordProgress(parsed.data.enrollmentId, lesson.id);
    revalidatePath(`/learn/${lesson.courseSlug}`);
    revalidatePath(`/learn/${lesson.courseSlug}/lessons/${lesson.order}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof ProgressAlreadyRecordedError) {
      return { ok: false, error: 'ALREADY_COMPLETED' };
    }
    console.error('[markLessonCompleteAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
