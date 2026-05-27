'use server';

import { revalidatePath } from 'next/cache';

import { findAttemptOwnedBy, gradeAndSubmitAttempt } from '@/features/attempts/data/attempts';
import { SubmitAttemptSchema } from '@/features/attempts/schemas/attempt';
import { checkAndMarkComplete } from '@/features/completions/data/completions';
import { findEnrolledCourseBySlug } from '@/features/enrollments/data/enrollments';
import { AuthError, requireUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

type SubmitAttemptResult =
  | { ok: true; data: { score: number; passed: boolean } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'RATE_LIMITED'
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

  // Rate limit: 10 submissions per minute keyed on userId + quizId.
  // Checked after ownership verification so quizId is available.
  const rl = await checkRateLimit({
    key: `submit-attempt:${user.id}:${attempt.quizId}`,
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    return { ok: false, error: 'RATE_LIMITED' };
  }

  let result;
  try {
    result = await gradeAndSubmitAttempt({
      attemptId: attempt.id,
      userId: user.id,
      answers: parsed.data.answers,
    });
  } catch (e) {
    console.error('[submitAttemptAction:grade]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
  if ('error' in result) {
    return { ok: false, error: result.error };
  }

  // If this submission was a passing one, re-run the completion check so a
  // newly-met requirement flips the course to "complete" and issues a cert.
  // Failures here mustn't surface to the learner — the score was recorded
  // successfully.
  if (result.passed) {
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
  return { ok: true, data: { score: result.score, passed: result.passed } };
}
