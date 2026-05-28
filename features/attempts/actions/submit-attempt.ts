'use server';

import { revalidatePath } from 'next/cache';

import {
  findAttemptOwnedBy,
  gradeAndSubmitAttempt,
} from '@/features/attempts/data/attempts';
import { SubmitAttemptSchema } from '@/features/attempts/schemas/attempt';
import { checkAndMarkComplete } from '@/features/completions/data/completions';
import { findEnrolledCourseBySlug } from '@/features/enrollments/data/enrollments';
import { AuthError, requireUser } from '@/lib/auth';

type SubmitAttemptResult =
  | {
      ok: true;
      // When `pending` is true the attempt has at least one TEXT answer
      // waiting for the instructor — score/passed are null until then.
      data: { score: number | null; passed: boolean | null; pending: boolean };
    }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'NOT_FOUND'
        | 'NOT_IN_PROGRESS'
        | 'INVALID_ANSWERS'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function submitAttemptAction(
  context: { courseSlug: string },
  input: unknown,
): Promise<SubmitAttemptResult> {
  const parsed = SubmitAttemptSchema.safeParse(input);
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

  // Confirm the attempt belongs to this user before any DB write.
  const attempt = await findAttemptOwnedBy(parsed.data.attemptId, user.id);
  if (!attempt) return { ok: false, error: 'NOT_FOUND' };
  if (attempt.status !== 'IN_PROGRESS') {
    return { ok: false, error: 'NOT_IN_PROGRESS' };
  }

  let result;
  try {
    result = await gradeAndSubmitAttempt({
      attemptId: attempt.id,
      userId: user.id,
      autoSubmitted: parsed.data.autoSubmitted,
      answers: parsed.data.answers,
    });
  } catch (e) {
    console.error('[submitAttemptAction:grade]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
  if ('error' in result) {
    return { ok: false, error: result.error };
  }

  // Only re-run the completion check if this submission was an unambiguous
  // pass (passed === true). Pending attempts (TEXT answers waiting for the
  // instructor) leave passed=null and must NOT trigger completion until the
  // instructor finishes grading.
  if (result.passed === true) {
    try {
      const enrollment = await findEnrolledCourseBySlug(user.id, context.courseSlug);
      if (enrollment) {
        const completion = await checkAndMarkComplete(enrollment.enrollmentId, user.id);
        if (completion.wasMarkedComplete) {
          revalidatePath('/learn');
        }
      }
    } catch (e) {
      console.error('[submitAttemptAction:completionCheck]', e);
    }
  }

  revalidatePath(`/learn/${context.courseSlug}/quizzes/${attempt.quizId}`);
  revalidatePath(`/learn/${context.courseSlug}`);
  return {
    ok: true,
    data: {
      score: result.score,
      passed: result.passed,
      pending: result.pending,
    },
  };
}
