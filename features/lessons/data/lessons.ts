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

export type LessonForInstructorEdit = Pick<
  Lesson,
  'id' | 'title' | 'order' | 'content' | 'contentType' | 'isRequired' | 'courseId'
> & {
  course: { id: string; slug: string };
};

export async function findLessonOwnedByInstructorBySlugAndOrder(
  courseSlug: string,
  order: number,
  instructorId: string,
): Promise<LessonForInstructorEdit | null> {
  return prisma.lesson.findFirst({
    where: { order, course: { slug: courseSlug, instructorId } },
    select: {
      id: true,
      title: true,
      order: true,
      content: true,
      contentType: true,
      isRequired: true,
      courseId: true,
      course: { select: { id: true, slug: true } },
    },
  });
}

export async function findLessonOwnedByInstructorById(
  lessonId: string,
  instructorId: string,
): Promise<{ id: string; order: number; course: { id: string; slug: string } } | null> {
  return prisma.lesson.findFirst({
    where: { id: lessonId, course: { instructorId } },
    select: {
      id: true,
      order: true,
      course: { select: { id: true, slug: true } },
    },
  });
}

export async function updateLesson(input: {
  lessonId: string;
  title: string;
  content: string;
  isRequired: boolean;
}): Promise<Lesson> {
  return prisma.lesson.update({
    where: { id: input.lessonId },
    data: {
      title: input.title,
      content: input.content,
      isRequired: input.isRequired,
    },
  });
}

/**
 * Delete a lesson. Cascades via Prisma to its Progress rows (per schema:
 * Lesson → Progress with onDelete: Cascade). Quizzes attached to this lesson
 * also cascade, taking their Questions/Choices and Attempts/Answers with
 * them. Issued Certificates and the Enrollment.completedAt status persist —
 * deleting curriculum content does not retroactively un-issue a credential.
 */
export async function deleteLesson(lessonId: string): Promise<void> {
  await prisma.lesson.delete({ where: { id: lessonId } });
}

export type ReorderLessonsOutcome = { ok: true } | { ok: false; reason: 'SET_MISMATCH' };

/**
 * Reorder all lessons of a course in one transaction. The caller must already
 * have verified that `courseId` belongs to the acting instructor.
 *
 * Why two passes: Lesson has `@@unique([courseId, order])`, so we can't simply
 * write the new orders straight in — two rows would briefly share an order
 * mid-update. First pass moves every affected row into a temporary high range
 * (`order + 100000`) to clear the conflict space; second pass writes the
 * canonical 1..N order. We reject the request if the submitted set does not
 * exactly match this course's lesson set so a partial reorder cannot leave
 * orphaned rows behind.
 */
export async function reorderLessons(
  courseId: string,
  orderedLessonIds: string[],
): Promise<ReorderLessonsOutcome> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));
    if (existingIds.size !== orderedLessonIds.length) {
      return { ok: false, reason: 'SET_MISMATCH' };
    }
    for (const id of orderedLessonIds) {
      if (!existingIds.has(id)) return { ok: false, reason: 'SET_MISMATCH' };
    }

    for (const id of orderedLessonIds) {
      await tx.lesson.update({
        where: { id },
        data: { order: { increment: 100000 } },
      });
    }
    for (let i = 0; i < orderedLessonIds.length; i++) {
      await tx.lesson.update({
        where: { id: orderedLessonIds[i] },
        data: { order: i + 1 },
      });
    }
    return { ok: true };
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
