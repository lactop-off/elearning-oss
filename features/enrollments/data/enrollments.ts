import { Prisma } from '@/lib/generated/prisma/client';
import { prisma } from '@/lib/db';
import type { Enrollment } from '@/lib/generated/prisma/client';

export type EnrolledCourseSummary = {
  enrollmentId: string;
  enrolledAt: Date;
  completedAt: Date | null;
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    publishedAt: Date | null;
    instructor: { name: string };
  };
};

export class AlreadyEnrolledError extends Error {
  readonly code = 'ALREADY_ENROLLED' as const;
  constructor() {
    super('User is already enrolled in this course');
    this.name = 'AlreadyEnrolledError';
  }
}

export async function findEnrollment(userId: string, courseId: string): Promise<Enrollment | null> {
  return prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
}

export async function createEnrollment(userId: string, courseId: string): Promise<Enrollment> {
  try {
    return await prisma.enrollment.create({ data: { userId, courseId } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new AlreadyEnrolledError();
    }
    throw e;
  }
}

export type EnrolledCourseDetail = {
  enrollmentId: string;
  enrolledAt: Date;
  completedAt: Date | null;
  course: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    instructor: { name: string };
  };
};

export async function findEnrolledCourseBySlug(
  userId: string,
  slug: string,
): Promise<EnrolledCourseDetail | null> {
  const row = await prisma.enrollment.findFirst({
    where: { userId, course: { slug, publishedAt: { not: null } } },
    select: {
      id: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          instructor: { select: { name: true } },
        },
      },
    },
  });
  if (!row) return null;
  return {
    enrollmentId: row.id,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt,
    course: row.course,
  };
}

export async function findEnrollmentOwnedBy(
  enrollmentId: string,
  userId: string,
): Promise<{
  id: string;
  course: { id: string; slug: string };
} | null> {
  return prisma.enrollment.findFirst({
    where: { id: enrollmentId, userId },
    select: {
      id: true,
      course: { select: { id: true, slug: true } },
    },
  });
}

/**
 * Find an enrollment by userId and courseId. Returns the enrollmentId when the
 * user is enrolled, or null otherwise. Used by grading flows that need to
 * trigger the completion check after a quiz is manually graded.
 */
export async function findEnrollmentByCourse(
  userId: string,
  courseId: string,
): Promise<{ enrollmentId: string } | null> {
  const row = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  if (!row) return null;
  return { enrollmentId: row.id };
}

export async function listEnrollmentsByUser(userId: string): Promise<EnrolledCourseSummary[]> {
  const rows = await prisma.enrollment.findMany({
    where: { userId },
    select: {
      id: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          publishedAt: true,
          instructor: { select: { name: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'desc' },
  });
  return rows.map((row) => ({
    enrollmentId: row.id,
    enrolledAt: row.enrolledAt,
    completedAt: row.completedAt,
    course: row.course,
  }));
}
