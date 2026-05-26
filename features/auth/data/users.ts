import { prisma } from '@/lib/db';
import type { User } from '@/lib/generated/prisma/client';
import type { UserRole } from '@/lib/generated/prisma/enums';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUserWithPassword(input: {
  email: string;
  name: string;
  passwordHash: string;
  role?: UserRole;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      role: input.role ?? 'LEARNER',
    },
  });
}
