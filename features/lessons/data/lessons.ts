import { prisma } from '@/lib/db';
import type { Lesson } from '@/lib/generated/prisma/client';

export type LessonListItem = Pick<
  Lesson,
  'id' | 'title' | 'order' | 'contentType' | 'isRequired' | 'createdAt' | 'updatedAt'
>;

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
