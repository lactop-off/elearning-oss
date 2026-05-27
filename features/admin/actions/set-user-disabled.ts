'use server';

import { revalidatePath } from 'next/cache';

import { AuthError, requireRole } from '@/lib/auth';
import { SetUserDisabledSchema } from '@/features/admin/schemas/admin';
import { setUserDisabled } from '@/features/admin/data/admin';

type SetUserDisabledResult =
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

export async function setUserDisabledAction(input: unknown): Promise<SetUserDisabledResult> {
  let admin;
  try {
    admin = await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.code };
    return { ok: false, error: 'INTERNAL_ERROR' };
  }

  const parsed = SetUserDisabledSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };

  // 自分自身の無効化は禁止
  if (admin.id === parsed.data.userId) {
    return { ok: false, error: 'SELF_FORBIDDEN' };
  }

  try {
    const updated = await setUserDisabled(parsed.data.userId, parsed.data.disabled);
    if (!updated) return { ok: false, error: 'NOT_FOUND' };
    revalidatePath('/admin/users');
    return { ok: true, data: {} };
  } catch (e) {
    console.error('[setUserDisabledAction]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
