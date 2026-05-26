'use server';

import { revalidatePath } from 'next/cache';

import {
  findLessonOwnedByInstructorById,
  updateLesson,
} from '@/features/lessons/data/lessons';
import {
  UpdateLessonSchema,
  type UpdateLessonInput,
} from '@/features/lessons/schemas/lesson';
import { AuthError, requireRole } from '@/lib/auth';

type UpdateLessonResult =
  | { ok: true; data: { id: string; order: number; courseSlug: string } }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'LESSON_NOT_FOUND'
        | 'INTERNAL_ERROR';
      issues?: unknown;
    };

export async function updateLessonAction(input: unknown): Promise<UpdateLessonResult> {
  const parsed = UpdateLessonSchema.safeParse(input);
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

  // Re-resolve the lesson from the server so the action never trusts the
  // client lessonId alone — we confirm the lesson is in a course this
  // instructor owns before writing.
  const lesson = await findLessonOwnedByInstructorById(parsed.data.lessonId, user.id);
  if (!lesson) return { ok: false, error: 'LESSON_NOT_FOUND' };

  try {
    const data: UpdateLessonInput = parsed.data;
    await updateLesson({
      lessonId: lesson.id,
      title: data.title,
      content: data.content,
      isRequired: data.isRequired,
    });
    revalidatePath(`/instructor/courses/${lesson.course.slug}`);
    revalidatePath(`/instructor/courses/${lesson.course.slug}/lessons/${lesson.order}/edit`);
    return {
      ok: true,
      data: { id: lesson.id, order: lesson.order, courseSlug: lesson.course.slug },
    };
  } catch (e) {
    console.error('[updateLessonAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
