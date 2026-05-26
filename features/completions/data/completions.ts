import { randomUUID } from 'node:crypto';

import { prisma } from '@/lib/db';

export type CompletionCheck = {
  wasMarkedComplete: boolean;
  certificateSerial: string | null;
};

export type CertificateSummary = {
  serial: string;
  issuedAt: Date;
};

export type CourseRequirementsProgress = {
  requiredLessonsTotal: number;
  requiredLessonsCompleted: number;
  requiredQuizzesTotal: number;
  requiredQuizzesPassed: number;
};

/**
 * If the user has completed every required lesson AND passed every required
 * quiz in the course tied to this enrollment, set Enrollment.completedAt and
 * issue a Certificate. Idempotent: a second call after completion is a no-op
 * and returns the existing serial.
 *
 * A course with zero required items (no required lessons and no required
 * quizzes) is intentionally never marked complete — there's nothing to grade
 * against.
 */
export async function checkAndMarkComplete(
  enrollmentId: string,
  userId: string,
): Promise<CompletionCheck> {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.enrollment.findFirst({
      where: { id: enrollmentId, userId },
      select: { id: true, courseId: true, completedAt: true },
    });
    if (!enrollment) return { wasMarkedComplete: false, certificateSerial: null };

    if (enrollment.completedAt) {
      const existing = await tx.certificate.findUnique({
        where: { userId_courseId: { userId, courseId: enrollment.courseId } },
        select: { serial: true },
      });
      return { wasMarkedComplete: false, certificateSerial: existing?.serial ?? null };
    }

    const [requiredLessons, completedLessons, requiredQuizzes, passedQuizzes] =
      await Promise.all([
        tx.lesson.count({ where: { courseId: enrollment.courseId, isRequired: true } }),
        tx.progress.count({
          where: {
            enrollmentId,
            lesson: { courseId: enrollment.courseId, isRequired: true },
          },
        }),
        tx.quiz.count({
          where: { lesson: { courseId: enrollment.courseId }, isRequired: true },
        }),
        tx.quiz.count({
          where: {
            lesson: { courseId: enrollment.courseId },
            isRequired: true,
            attempts: { some: { userId, status: 'SUBMITTED', passed: true } },
          },
        }),
      ]);

    const totalRequired = requiredLessons + requiredQuizzes;
    const totalCompleted = completedLessons + passedQuizzes;
    if (totalRequired === 0 || totalCompleted < totalRequired) {
      return { wasMarkedComplete: false, certificateSerial: null };
    }

    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { completedAt: new Date() },
    });
    const serial = `CERT-${randomUUID()}`;
    const cert = await tx.certificate.create({
      data: { userId, courseId: enrollment.courseId, serial },
      select: { serial: true },
    });
    return { wasMarkedComplete: true, certificateSerial: cert.serial };
  });
}

/**
 * Snapshot the user's progress against every required item in the course —
 * lessons completed and quizzes passed. Used by the learner course-detail page
 * to display two separate progress lines.
 */
export async function getCourseRequirementsProgress(
  enrollmentId: string,
  userId: string,
  courseId: string,
): Promise<CourseRequirementsProgress> {
  const [requiredLessonsTotal, requiredLessonsCompleted, requiredQuizzesTotal, requiredQuizzesPassed] =
    await Promise.all([
      prisma.lesson.count({ where: { courseId, isRequired: true } }),
      prisma.progress.count({
        where: { enrollmentId, lesson: { courseId, isRequired: true } },
      }),
      prisma.quiz.count({ where: { lesson: { courseId }, isRequired: true } }),
      prisma.quiz.count({
        where: {
          lesson: { courseId },
          isRequired: true,
          attempts: { some: { userId, status: 'SUBMITTED', passed: true } },
        },
      }),
    ]);
  return {
    requiredLessonsTotal,
    requiredLessonsCompleted,
    requiredQuizzesTotal,
    requiredQuizzesPassed,
  };
}

export async function findCertificate(
  userId: string,
  courseId: string,
): Promise<CertificateSummary | null> {
  return prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { serial: true, issuedAt: true },
  });
}
