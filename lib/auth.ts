import { auth } from '@/auth';
import type { UserRole } from '@/lib/generated/prisma/enums';

export class AuthError extends Error {
  constructor(
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function getSession() {
  return auth();
}

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new AuthError('UNAUTHORIZED', 'Not authenticated');
  }
  return session.user;
}

export async function requireRole(...allowed: UserRole[]) {
  const user = await requireUser();
  if (!allowed.includes(user.role)) {
    throw new AuthError('FORBIDDEN', `Required role: ${allowed.join(' or ')}`);
  }
  return user;
}
