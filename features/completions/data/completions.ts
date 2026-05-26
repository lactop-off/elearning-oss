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

/**
 * If the user has completed every required lesson of the course tied to this
 * enrollment, set Enrollment.completedAt and issue a Certificate. Idempotent:
 * a second call after completion is a no-op and returns the existing serial.
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

    const [requiredTotal, requiredCompleted] = await Promise.all([
      tx.lesson.count({ where: { courseId: enrollment.courseId, isRequired: true } }),
      tx.progress.count({
        where: {
          enrollmentId,
          lesson: { courseId: enrollment.courseId, isRequired: true },
        },
      }),
    ]);
    if (requiredTotal === 0 || requiredCompleted < requiredTotal) {
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

export async function findCertificate(
  userId: string,
  courseId: string,
): Promise<CertificateSummary | null> {
  return prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { serial: true, issuedAt: true },
  });
}
