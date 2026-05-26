'use server';

import { revalidatePath } from 'next/cache';

import { findQuizOwnedByInstructor, updateQuiz } from '@/features/quizzes/data/quizzes';
import { UpdateQuizSchema } from '@/features/quizzes/schemas/quiz';
import { AuthError, requireRole } from '@/lib/auth';

type UpdateQuizResult =
  | { ok: true; data: { quizId: string; courseSlug: string } }
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

export async function updateQuizAction(input: unknown): Promise<UpdateQuizResult> {
  const parsed = UpdateQuizSchema.safeParse(input);
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

  // Re-verify the quiz is in a course this instructor owns before writing.
  const quiz = await findQuizOwnedByInstructor(parsed.data.quizId, user.id);
  if (!quiz) return { ok: false, error: 'QUIZ_NOT_FOUND' };

  try {
    await updateQuiz({
      quizId: quiz.id,
      title: parsed.data.title,
      description: parsed.data.description,
      passingScore: parsed.data.passingScore,
      isRequired: parsed.data.isRequired,
    });
    revalidatePath(`/instructor/courses/${quiz.course.slug}`);
    revalidatePath(`/instructor/courses/${quiz.course.slug}/quizzes/${quiz.id}`);
    revalidatePath(`/instructor/courses/${quiz.course.slug}/quizzes/${quiz.id}/edit`);
    return { ok: true, data: { quizId: quiz.id, courseSlug: quiz.course.slug } };
  } catch (e) {
    console.error('[updateQuizAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
