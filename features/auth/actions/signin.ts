'use server';

import { headers } from 'next/headers';
import { AuthError as NextAuthError } from 'next-auth';

import { signIn } from '@/auth';
import { SignInSchema } from '@/features/auth/schemas/credentials';
import { checkRateLimit } from '@/lib/rate-limit';

type SignInResult =
  | { ok: true }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
      issues?: unknown;
    };

/** Resolve the best available client IP from standard proxy headers. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may be a comma-separated list; take the first (client) IP.
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip') ?? 'unknown';
}

export async function signInWithCredentials(input: unknown): Promise<SignInResult> {
  const parsed = SignInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  // Rate limit — two independent buckets to prevent IP-spoofing bypass:
  //   1. email bucket  : 5 attempts / 15 min  — primary defence, IP-agnostic.
  //   2. IP bucket     : 30 attempts / 15 min  — password-spray defence.
  // Both are checked in parallel; either exceeding the limit blocks the request.
  const email = parsed.data.email.toLowerCase().trim();
  const ip = await getClientIp();
  const [rlEmail, rlIp] = await Promise.all([
    checkRateLimit({ key: `signin:email:${email}`, limit: 5, windowMs: 15 * 60 * 1000 }),
    checkRateLimit({ key: `signin:ip:${ip}`, limit: 30, windowMs: 15 * 60 * 1000 }),
  ]);
  if (!rlEmail.allowed || !rlIp.allowed) {
    return { ok: false, error: 'RATE_LIMITED' };
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
