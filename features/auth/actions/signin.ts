'use server';

import { AuthError as NextAuthError } from 'next-auth';

import { signIn } from '@/auth';
import { SignInSchema } from '@/features/auth/schemas/credentials';

type SignInResult =
  | { ok: true }
  | { ok: false; error: 'INVALID_INPUT' | 'INVALID_CREDENTIALS' | 'INTERNAL_ERROR'; issues?: unknown };

export async function signInWithCredentials(input: unknown): Promise<SignInResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof NextAuthError) {
      if (e.type === 'CredentialsSignin') {
        return { ok: false, error: 'INVALID_CREDENTIALS' };
      }
    }
    console.error('[signInWithCredentials]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
