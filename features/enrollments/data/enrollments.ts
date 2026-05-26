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

export async function findEnrollment(
  userId: string,
  courseId: string,
): Promise<Enrollment | null> {
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
