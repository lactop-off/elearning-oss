'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  findCourseOwnedBy,
  setCoursePublishedAt,
} from '@/features/courses/data/courses';
import { AuthError, requireRole } from '@/lib/auth';

const Input = z.object({
  courseId: z.string().min(1),
  publish: z.boolean(),
});

type PublishResult =
  | { ok: true; data: { publishedAt: string | null } }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR';
    };

export async function setCoursePublishedAction(input: unknown): Promise<PublishResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    throw e;
  }

  const course = await findCourseOwnedBy(parsed.data.courseId, user.id);
  if (!course) return { ok: false, error: 'NOT_FOUND' };

  try {
    const next = parsed.data.publish ? new Date() : null;
    await setCoursePublishedAt(course.id, next);
    revalidatePath('/instructor/courses');
    return { ok: true, data: { publishedAt: next ? next.toISOString() : null } };
  } catch (e) {
    console.error('[setCoursePublishedAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
