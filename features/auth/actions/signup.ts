'use server';

import { createUserWithPassword, findUserByEmail } from '@/features/auth/data/users';
import { SignUpSchema } from '@/features/auth/schemas/credentials';
import { hashPassword } from '@/lib/password';

type SignUpResult =
  | { ok: true; userId: string }
  | { ok: false; error: 'INVALID_INPUT' | 'EMAIL_TAKEN' | 'INTERNAL_ERROR'; issues?: unknown };

export async function signUp(input: unknown): Promise<SignUpResult> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  try {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return { ok: false, error: 'EMAIL_TAKEN' };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await createUserWithPassword({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });

    return { ok: true, userId: user.id };
  } catch (e) {
    console.error('[signUp]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
