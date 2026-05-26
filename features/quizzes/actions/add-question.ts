'use server';

import { revalidatePath } from 'next/cache';

import {
  createSingleChoiceQuestion,
} from '@/features/quizzes/data/questions';
import { findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { AddSingleChoiceQuestionSchema } from '@/features/quizzes/schemas/question';
import { AuthError, requireRole } from '@/lib/auth';

type AddQuestionResult =
  | { ok: true; data: { questionId: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'QUIZ_NOT_FOUND'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function addQuestionAction(input: unknown): Promise<AddQuestionResult> {
  const parsed = AddSingleChoiceQuestionSchema.safeParse(input);
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

  const quiz = await findQuizOwnedByInstructor(parsed.data.quizId, user.id);
  if (!quiz) return { ok: false, error: 'QUIZ_NOT_FOUND' };

  try {
    const result = await createSingleChoiceQuestion({
      quizId: quiz.id,
      body: parsed.data.body,
      points: parsed.data.points,
      choices: parsed.data.choices,
      correctChoiceIndex: parsed.data.correctChoiceIndex,
    });
    revalidatePath(`/instructor/courses/${quiz.course.slug}/quizzes/${quiz.id}`);
    revalidatePath(`/instructor/courses/${quiz.course.slug}`);
    return { ok: true, data: { questionId: result.questionId } };
  } catch (e) {
    console.error('[addQuestionAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
