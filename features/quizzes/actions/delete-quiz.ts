'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { deleteQuiz, findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { AuthError, requireRole } from '@/lib/auth';

const Input = z.object({
  quizId: z.string().min(1),
});

type DeleteQuizResult =
  | { ok: true; data: { courseSlug: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'QUIZ_NOT_FOUND'
        | 'INTERNAL_ERROR';
    };

export async function deleteQuizAction(input: unknown): Promise<DeleteQuizResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

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
    await deleteQuiz(quiz.id);
    revalidatePath(`/instructor/courses/${quiz.course.slug}`);
    revalidatePath(`/learn/${quiz.course.slug}`);
    return { ok: true, data: { courseSlug: quiz.course.slug } };
  } catch (e) {
    console.error('[deleteQuizAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
