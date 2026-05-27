'use server';

import { revalidatePath } from 'next/cache';

import { AuthError, requireRole } from '@/lib/auth';
import { CourseApprovalSchema } from '@/features/admin/schemas/admin';
import { approveCourse } from '@/features/admin/data/admin';

type ApproveCourseResult =
  | { ok: true; data: Record<string, never> }
  | {
      ok: false;
      error:
        | 'INVALID_INPUT'
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'SELF_FORBIDDEN'
        | 'INTERNAL_ERROR';
    };

export async function approveCourseAction(input: unknown): Promise<ApproveCourseResult> {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  const parsed = CourseApprovalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  try {
    const updated = await approveCourse(parsed.data.courseId, admin.id);
    if (!updated) return { ok: false, error: 'NOT_FOUND' };
    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    return { ok: true, data: {} };
  } catch (e) {
    console.error('[approveCourseAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
