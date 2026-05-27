'use server';

import { revalidatePath } from 'next/cache';

import { createQuiz, findLessonOwnedByInstructorForQuiz } from '@/features/quizzes/data/quizzes';
import { CreateQuizSchema, type CreateQuizInput } from '@/features/quizzes/schemas/quiz';
import { AuthError, requireRole } from '@/lib/auth';

type CreateQuizResult =
  | { ok: true; data: { quizId: string } }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'LESSON_NOT_FOUND' | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function createQuizAction(
  context: { courseSlug: string; lessonOrder: number },
  input: unknown,
): Promise<CreateQuizResult> {
  const parsed = CreateQuizSchema.safeParse(input);
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

  const lesson = await findLessonOwnedByInstructorForQuiz(
    context.courseSlug,
    context.lessonOrder,
    user.id,
  );
  if (!lesson) return { ok: false, error: 'LESSON_NOT_FOUND' };
  // Defend against client-supplied lessonId — overwrite with the server-resolved id.
  if (parsed.data.lessonId !== lesson.lessonId) {
    return { ok: false, error: 'LESSON_NOT_FOUND' };
  }

  try {
    const data: CreateQuizInput = parsed.data;
    const quiz = await createQuiz({
      lessonId: lesson.lessonId,
      title: data.title,
      description: data.description,
      passingScore: data.passingScore,
      isRequired: data.isRequired,
    });
    revalidatePath(`/instructor/courses/${context.courseSlug}`);
    return { ok: true, data: { quizId: quiz.id } };
  } catch (e) {
    console.error('[createQuizAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
