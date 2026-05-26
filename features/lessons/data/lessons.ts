import { prisma } from '@/lib/db';
import type { Lesson } from '@/lib/generated/prisma/client';

export type LessonListItem = Pick<
  Lesson,
  'id' | 'title' | 'order' | 'contentType' | 'isRequired' | 'createdAt' | 'updatedAt'
>;

export type LessonReadable = Pick<
  Lesson,
  'id' | 'title' | 'order' | 'contentType' | 'content' | 'isRequired'
>;

export async function findLessonByCourseAndOrder(
  courseId: string,
  order: number,
): Promise<LessonReadable | null> {
  return prisma.lesson.findFirst({
    where: { courseId, order },
    select: {
      id: true,
      title: true,
      order: true,
      contentType: true,
      content: true,
      isRequired: true,
    },
  });
}

export async function countLessonsByCourse(
  courseId: string,
): Promise<{ total: number; required: number }> {
  const [total, required] = await Promise.all([
    prisma.lesson.count({ where: { courseId } }),
    prisma.lesson.count({ where: { courseId, isRequired: true } }),
  ]);
  return { total, required };
}

export async function findLessonInEnrollment(
  enrollmentId: string,
  userId: string,
  lessonId: string,
): Promise<{ id: string; order: number; courseSlug: string } | null> {
  const row = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      course: {
        enrollments: { some: { id: enrollmentId, userId } },
      },
    },
    select: {
      id: true,
      order: true,
      course: { select: { slug: true } },
    },
  });
  if (!row) return null;
  return { id: row.id, order: row.order, courseSlug: row.course.slug };
}

export async function listLessonsByCourse(courseId: string): Promise<LessonListItem[]> {
  return prisma.lesson.findMany({
    where: { courseId },
    select: {
      id: true,
      title: true,
      order: true,
      contentType: true,
      isRequired: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { order: 'asc' },
  });
}

export async function createLesson(input: {
  courseId: string;
  title: string;
  content: string;
  isRequired: boolean;
}): Promise<Lesson> {
  // Compute the next order under a transaction so the @@unique([courseId, order])
  // constraint can't be raced by two concurrent inserts on the same course.
  return prisma.$transaction(async (tx) => {
    const last = await tx.lesson.findFirst({
      where: { courseId: input.courseId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;
    return tx.lesson.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        content: input.content,
        isRequired: input.isRequired,
        order: nextOrder,
      },
    });
  });
}
