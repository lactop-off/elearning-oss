'use server';

import { revalidatePath } from 'next/cache';

import { AuthError, requireRole } from '@/lib/auth';
import { CourseApprovalSchema } from '@/features/admin/schemas/admin';
import { revokeCourseApproval } from '@/features/admin/data/admin';

type RevokeCourseApprovalResult =
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

export async function revokeCourseApprovalAction(
  input: unknown,
): Promise<RevokeCourseApprovalResult> {
  try {
    await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  const parsed = CourseApprovalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  try {
    const updated = await revokeCourseApproval(parsed.data.courseId);
    if (!updated) return { ok: false, error: 'NOT_FOUND' };
    revalidatePath('/admin/courses');
    revalidatePath('/courses');
    return { ok: true, data: {} };
  } catch (e) {
    console.error('[revokeCourseApprovalAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
