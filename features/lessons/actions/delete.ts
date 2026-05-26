'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  deleteLesson,
  findLessonOwnedByInstructorById,
} from '@/features/lessons/data/lessons';
import { AuthError, requireRole } from '@/lib/auth';

const Input = z.object({
  lessonId: z.string().min(1),
});

type DeleteLessonResult =
  | { ok: true; data: { courseSlug: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'LESSON_NOT_FOUND'
        | 'INTERNAL_ERROR';
    };

export async function deleteLessonAction(input: unknown): Promise<DeleteLessonResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  const lesson = await findLessonOwnedByInstructorById(parsed.data.lessonId, user.id);
  if (!lesson) return { ok: false, error: 'LESSON_NOT_FOUND' };

  try {
    await deleteLesson(lesson.id);
    revalidatePath(`/instructor/courses/${lesson.course.slug}`);
    revalidatePath(`/learn/${lesson.course.slug}`);
    return { ok: true, data: { courseSlug: lesson.course.slug } };
  } catch (e) {
    console.error('[deleteLessonAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
