import { prisma } from '@/lib/db';
import type { UserRole } from '@/lib/generated/prisma/enums';

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  disabledAt: Date | null;
  createdAt: Date;
  authoredCount: number;
};

export type PendingCourseRow = {
  id: string;
  slug: string;
  title: string;
  instructorName: string | null;
  publishedAt: Date;
};

export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const rows = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabledAt: true,
      createdAt: true,
      _count: { select: { coursesAuthored: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    disabledAt: row.disabledAt,
    createdAt: row.createdAt,
    authoredCount: row._count.coursesAuthored,
  }));
}

export async function setUserRole(userId: string, role: UserRole): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { disabledAt: disabled ? new Date() : null },
      select: { id: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function listCoursesForApproval(): Promise<PendingCourseRow[]> {
  const rows = await prisma.course.findMany({
    where: {
      publishedAt: { not: null },
      approvedAt: null,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      publishedAt: true,
      instructor: { select: { name: true } },
    },
    orderBy: { publishedAt: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    instructorName: row.instructor.name,
    // publishedAt is non-null here because the where clause filters for it
    publishedAt: row.publishedAt as Date,
  }));
}

export async function approveCourse(courseId: string, adminId: string): Promise<boolean> {
  try {
    await prisma.course.update({
      where: { id: courseId },
      data: { approvedAt: new Date(), approvedById: adminId },
      select: { id: true },
    });
    return true;
  } catch {
    return false;
  }
}

export async function revokeCourseApproval(courseId: string): Promise<boolean> {
  try {
    await prisma.course.update({
      where: { id: courseId },
      data: { approvedAt: null, approvedById: null },
      select: { id: true },
    });
    return true;
  } catch {
    return false;
  }
}
