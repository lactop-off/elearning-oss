'use server';

import { revalidatePath } from 'next/cache';

import {
  findAttemptOwnedBy,
  gradeAndSubmitAttempt,
} from '@/features/attempts/data/attempts';
import { SubmitAttemptSchema } from '@/features/attempts/schemas/attempt';
import { AuthError, requireUser } from '@/lib/auth';

type SubmitAttemptResult =
  | { ok: true; data: { score: number; passed: boolean } }
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

  try {
    const result = await gradeAndSubmitAttempt({
      attemptId: attempt.id,
      userId: user.id,
      answers: parsed.data.answers,
    });
    if ('error' in result) {
      return { ok: false, error: result.error };
    }
    revalidatePath(`/learn/${context.courseSlug}/quizzes/${attempt.quizId}`);
    revalidatePath(`/learn/${context.courseSlug}`);
    return { ok: true, data: { score: result.score, passed: result.passed } };
  } catch (e) {
    console.error('[submitAttemptAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
