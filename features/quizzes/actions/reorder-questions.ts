'use server';

import { revalidatePath } from 'next/cache';

import { findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { reorderQuestions } from '@/features/quizzes/data/questions';
import { ReorderQuestionsSchema } from '@/features/quizzes/schemas/question';
import { AuthError, requireRole } from '@/lib/auth';

type ReorderQuestionsResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'QUIZ_NOT_FOUND'
        | 'SET_MISMATCH'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function reorderQuestionsAction(input: unknown): Promise<ReorderQuestionsResult> {
  const parsed = ReorderQuestionsSchema.safeParse(input);
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

  // Re-verify the quiz is in a course this instructor owns.
  const quiz = await findQuizOwnedByInstructor(parsed.data.quizId, user.id);
  if (!quiz) return { ok: false, error: 'QUIZ_NOT_FOUND' };

  try {
    const outcome = await reorderQuestions(
      parsed.data.quizId,
      parsed.data.orderedQuestionIds,
    );
    if (!outcome.ok) return { ok: false, error: outcome.reason };
    revalidatePath(`/instructor/courses/${quiz.course.slug}/quizzes/${quiz.id}`);
    return { ok: true };
  } catch (e) {
    console.error('[reorderQuestionsAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
