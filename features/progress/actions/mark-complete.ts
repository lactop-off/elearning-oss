'use server';

import { revalidatePath } from 'next/cache';

import { checkAndMarkComplete } from '@/features/completions/data/completions';
import { findLessonInEnrollment } from '@/features/lessons/data/lessons';
import {
  ProgressAlreadyRecordedError,
  recordProgress,
} from '@/features/progress/data/progress';
import { MarkCompleteSchema } from '@/features/progress/schemas/progress';
import { AuthError, requireUser } from '@/lib/auth';

type MarkCompleteResult =
  | {
      ok: true;
      data: { courseCompleted: boolean; certificateSerial: string | null };
    }
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

  // Re-validate that the lesson belongs to a course this user is enrolled in.
  const lesson = await findLessonInEnrollment(
    parsed.data.enrollmentId,
    user.id,
    parsed.data.lessonId,
  );
  if (!lesson) return { ok: false, error: 'NOT_FOUND' };

  try {
    await recordProgress(parsed.data.enrollmentId, lesson.id);
  } catch (e) {
    if (!(e instanceof ProgressAlreadyRecordedError)) {
      console.error('[markLessonCompleteAction:recordProgress]', e);
      return { ok: false, error: 'INTERNAL_ERROR' };
    }
    // Otherwise fall through — completion check still runs in case the user
    // previously hit a completion edge case that didn't set completedAt.
  }

  let completion;
  try {
    completion = await checkAndMarkComplete(parsed.data.enrollmentId, user.id);
  } catch (e) {
    // Progress is already recorded; surface the failure but keep the data
    // consistent. The next mark-complete will retry the completion check.
    console.error('[markLessonCompleteAction:checkAndMarkComplete]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  revalidatePath(`/learn/${lesson.courseSlug}`);
  revalidatePath(`/learn/${lesson.courseSlug}/lessons/${lesson.order}`);
  if (completion.wasMarkedComplete) {
    revalidatePath('/learn');
  }

  return {
    ok: true,
    data: {
      courseCompleted: completion.wasMarkedComplete || completion.certificateSerial !== null,
      certificateSerial: completion.certificateSerial,
    },
  };
}
