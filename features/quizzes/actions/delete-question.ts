'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  deleteQuestion,
  findQuestionOwnedByInstructor,
} from '@/features/quizzes/data/questions';
import { AuthError, requireRole } from '@/lib/auth';

const Input = z.object({
  questionId: z.string().min(1),
});

type DeleteQuestionResult =
  | { ok: true; data: { quizId: string; courseSlug: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'QUESTION_NOT_FOUND'
        | 'INTERNAL_ERROR';
    };

export async function deleteQuestionAction(input: unknown): Promise<DeleteQuestionResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  const question = await findQuestionOwnedByInstructor(parsed.data.questionId, user.id);
  if (!question) return { ok: false, error: 'QUESTION_NOT_FOUND' };

  try {
    await deleteQuestion(question.id);
    revalidatePath(`/instructor/courses/${question.quiz.course.slug}/quizzes/${question.quiz.id}`);
    return {
      ok: true,
      data: { quizId: question.quiz.id, courseSlug: question.quiz.course.slug },
    };
  } catch (e) {
    console.error('[deleteQuestionAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
