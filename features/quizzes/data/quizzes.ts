import { prisma } from '@/lib/db';
import type { Quiz } from '@/lib/generated/prisma/client';

export type QuizListItem = Pick<
  Quiz,
  'id' | 'title' | 'description' | 'passingScore' | 'isRequired' | 'createdAt'
> & {
  questionCount: number;
};

export async function createQuiz(input: {
  lessonId: string;
  title: string;
  description: string;
  passingScore: number;
  isRequired: boolean;
}): Promise<Quiz> {
  return prisma.quiz.create({
    data: {
      lessonId: input.lessonId,
      title: input.title,
      description: input.description || null,
      passingScore: input.passingScore,
      isRequired: input.isRequired,
    },
  });
}

export async function listQuizzesByLesson(lessonId: string): Promise<QuizListItem[]> {
  const rows = await prisma.quiz.findMany({
    where: { lessonId },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      isRequired: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    passingScore: row.passingScore,
    isRequired: row.isRequired,
    createdAt: row.createdAt,
    questionCount: row._count.questions,
  }));
}

export async function findQuizOwnedByInstructor(
  quizId: string,
  instructorId: string,
): Promise<{
  id: string;
  title: string;
  description: string | null;
  passingScore: number;
  isRequired: boolean;
  lesson: { order: number; title: string } | null;
  course: { id: string; slug: string; title: string };
} | null> {
  const row = await prisma.quiz.findFirst({
    where: {
      id: quizId,
      lesson: { course: { instructorId } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      passingScore: true,
      isRequired: true,
      lesson: { select: { order: true, title: true, course: { select: { id: true, slug: true, title: true } } } },
    },
  });
  if (!row || !row.lesson) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    passingScore: row.passingScore,
    isRequired: row.isRequired,
    lesson: { order: row.lesson.order, title: row.lesson.title },
    course: row.lesson.course,
  };
}

export type LessonQuizzesOverviewItem = {
  lessonId: string;
  lessonOrder: number;
  lessonTitle: string;
  quizzes: {
    id: string;
    title: string;
    passingScore: number;
    isRequired: boolean;
    questionCount: number;
  }[];
};

export async function listLessonQuizzesByCourseOwned(
  courseSlug: string,
  instructorId: string,
): Promise<LessonQuizzesOverviewItem[]> {
  const lessons = await prisma.lesson.findMany({
    where: { course: { slug: courseSlug, instructorId } },
    select: {
      id: true,
      order: true,
      title: true,
      quizzes: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          isRequired: true,
          _count: { select: { questions: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });
  return lessons.map((lesson) => ({
    lessonId: lesson.id,
    lessonOrder: lesson.order,
    lessonTitle: lesson.title,
    quizzes: lesson.quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      passingScore: quiz.passingScore,
      isRequired: quiz.isRequired,
      questionCount: quiz._count.questions,
    })),
  }));
}

export async function findLessonOwnedByInstructorForQuiz(
  courseSlug: string,
  lessonOrder: number,
  instructorId: string,
): Promise<{ lessonId: string; courseSlug: string; lessonTitle: string } | null> {
  const lesson = await prisma.lesson.findFirst({
    where: {
      order: lessonOrder,
      course: { slug: courseSlug, instructorId },
    },
    select: { id: true, title: true, course: { select: { slug: true } } },
  });
  if (!lesson) return null;
  return {
    lessonId: lesson.id,
    courseSlug: lesson.course.slug,
    lessonTitle: lesson.title,
  };
}
