import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';
import type { Progress } from '@/lib/generated/prisma/client';

export class ProgressAlreadyRecordedError extends Error {
  readonly code = 'ALREADY_COMPLETED' as const;
  constructor() {
    super('Lesson already marked as complete');
    this.name = 'ProgressAlreadyRecordedError';
  }
}

export async function listProgressByEnrollment(
  enrollmentId: string,
): Promise<{ lessonId: string; completedAt: Date }[]> {
  return prisma.progress.findMany({
    where: { enrollmentId },
    select: { lessonId: true, completedAt: true },
  });
}

export async function recordProgress(
  enrollmentId: string,
  lessonId: string,
): Promise<Progress> {
  try {
    return await prisma.progress.create({ data: { enrollmentId, lessonId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new ProgressAlreadyRecordedError();
    }
    throw e;
  }
}
