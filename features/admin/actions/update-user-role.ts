'use server';

import { revalidatePath } from 'next/cache';

import { AuthError, requireRole } from '@/lib/auth';
import { UpdateUserRoleSchema } from '@/features/admin/schemas/admin';
import { setUserRole } from '@/features/admin/data/admin';

type UpdateUserRoleResult =
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

export async function updateUserRoleAction(input: unknown): Promise<UpdateUserRoleResult> {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  const parsed = UpdateUserRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  // 自分自身のロール変更は禁止（最後の管理者ロック回避目的）
  if (admin.id === parsed.data.userId) {
    return { ok: false, error: 'SELF_FORBIDDEN' };
  }

  try {
    const updated = await setUserRole(parsed.data.userId, parsed.data.role);
    if (!updated) return { ok: false, error: 'NOT_FOUND' };
    revalidatePath('/admin/users');
    return { ok: true, data: {} };
  } catch (e) {
    console.error('[updateUserRoleAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
