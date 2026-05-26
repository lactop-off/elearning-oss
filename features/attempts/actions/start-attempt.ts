'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  findInProgressAttempt,
  startAttempt,
} from '@/features/attempts/data/attempts';
import { findQuizForLearner } from '@/features/quizzes/data/quizzes';
import { AuthError, requireUser } from '@/lib/auth';

const Input = z.object({
  courseSlug: z.string().min(1),
  quizId: z.string().min(1),
});

type StartAttemptResult =
  | { ok: true; data: { attemptId: string; resumed: boolean } }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    };

export async function startAttemptAction(input: unknown): Promise<StartAttemptResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError && e.code === 'UNAUTHORIZED') {
      return { ok: false, error: 'UNAUTHORIZED' };
    }
    throw e;
  }

  // Confirm the user can actually take this quiz before creating an attempt.
  const quiz = await findQuizForLearner(parsed.data.courseSlug, parsed.data.quizId, user.id);
  if (!quiz) return { ok: false, error: 'NOT_FOUND' };

  try {
    const existing = await findInProgressAttempt(user.id, quiz.id);
    if (existing) {
      return { ok: true, data: { attemptId: existing.id, resumed: true } };
    }
    const attempt = await startAttempt(user.id, quiz.id);
    revalidatePath(`/learn/${parsed.data.courseSlug}/quizzes/${quiz.id}`);
    return { ok: true, data: { attemptId: attempt.id, resumed: false } };
  } catch (e) {
    console.error('[startAttemptAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
