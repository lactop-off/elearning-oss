import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';
import type { Course } from '@/lib/generated/prisma/client';

export type CourseListItem = Pick<
  Course,
  'id' | 'slug' | 'title' | 'description' | 'publishedAt' | 'createdAt' | 'updatedAt'
>;

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

export async function listCoursesByInstructor(instructorId: string): Promise<CourseListItem[]> {
  return prisma.course.findMany({
    where: { instructorId },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function findCourseOwnedBy(
  id: string,
  instructorId: string,
): Promise<Course | null> {
  return prisma.course.findFirst({ where: { id, instructorId } });
}

export async function findCourseBySlugOwnedBy(
  slug: string,
  instructorId: string,
): Promise<Course | null> {
  return prisma.course.findFirst({ where: { slug, instructorId } });
}

export async function setCoursePublishedAt(id: string, value: Date | null): Promise<void> {
  await prisma.course.update({ where: { id }, data: { publishedAt: value } });
}

export type PublishedCourseSummary = Pick<
  Course,
  'id' | 'slug' | 'title' | 'description' | 'publishedAt'
> & {
  instructor: { id: string; name: string };
};

export async function listPublishedCourses(): Promise<PublishedCourseSummary[]> {
  return prisma.course.findMany({
    where: { publishedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      publishedAt: true,
      instructor: { select: { id: true, name: true } },
    },
    orderBy: { publishedAt: 'desc' },
  });
}

export async function findPublishedCourseBySlug(
  slug: string,
): Promise<PublishedCourseSummary | null> {
  return prisma.course.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      publishedAt: true,
      instructor: { select: { id: true, name: true } },
    },
  });
}

export async function findPublishedCourseById(
  id: string,
): Promise<{ id: string; slug: string } | null> {
  return prisma.course.findFirst({
    where: { id, publishedAt: { not: null } },
    select: { id: true, slug: true },
  });
}
