'use server';

import { headers } from 'next/headers';

import { createUserWithPassword, findUserByEmail } from '@/features/auth/data/users';
import { SignUpSchema } from '@/features/auth/schemas/credentials';
import { hashPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';

type SignUpResult =
  | { ok: true }
  | {
      ok: false;
      error: 'INVALID_INPUT' | 'EMAIL_TAKEN' | 'RATE_LIMITED' | 'INTERNAL_ERROR';
      issues?: unknown;
    };

/** Resolve the best available client IP from standard proxy headers. */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return h.get('x-real-ip') ?? 'unknown';
}

export async function signUp(input: unknown): Promise<SignUpResult> {
  const parsed = SignUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'INVALID_INPUT', issues: parsed.error.issues };
  }

  // Rate limit — two independent buckets to prevent IP-spoofing bypass:
  //   1. email bucket  : 5 attempts / 1 hour  — primary defence, IP-agnostic.
  //   2. IP bucket     : 20 attempts / 1 hour  — bulk registration defence.
  // Both are checked in parallel; either exceeding the limit blocks the request.
  const email = parsed.data.email.toLowerCase().trim();
  const ip = await getClientIp();
  const [rlEmail, rlIp] = await Promise.all([
    checkRateLimit({ key: `signup:email:${email}`, limit: 5, windowMs: 60 * 60 * 1000 }),
    checkRateLimit({ key: `signup:ip:${ip}`, limit: 20, windowMs: 60 * 60 * 1000 }),
  ]);
  if (!rlEmail.allowed || !rlIp.allowed) {
    return { ok: false, error: 'RATE_LIMITED' };
  }

  try {
    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return { ok: false, error: 'EMAIL_TAKEN' };
    }

    const passwordHash = await hashPassword(parsed.data.password);
    await createUserWithPassword({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });

    return { ok: true };
  } catch (e) {
    console.error('[signUp]', e);
    return { ok: false, error: 'INTERNAL_ERROR' };
  }
}
