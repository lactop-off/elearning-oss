import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';
import type { Course } from '@/lib/generated/prisma/client';

export class SlugTakenError extends Error {
  readonly code = 'SLUG_TAKEN' as const;
  constructor(slug: string) {
    super(`Course slug "${slug}" is already taken`);
    this.name = 'SlugTakenError';
  }
}

export async function createCourse(input: {
  title: string;
  slug: string;
  description: string;
  instructorId: string;
}): Promise<Course> {
  try {
    return await prisma.course.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description || null,
        instructorId: input.instructorId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new SlugTakenError(input.slug);
    }
    throw e;
  }
}
