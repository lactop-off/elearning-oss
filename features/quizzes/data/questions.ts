import { prisma } from '@/lib/db';
import type { Choice, Question, QuestionType } from '@/lib/generated/prisma/client';

export type QuestionWithChoices = Pick<
  Question,
  'id' | 'body' | 'order' | 'points' | 'type'
> & {
  choices: Pick<Choice, 'id' | 'body' | 'order' | 'isCorrect'>[];
};

export async function listQuestionsByQuiz(quizId: string): Promise<QuestionWithChoices[]> {
  return prisma.question.findMany({
    where: { quizId },
    select: {
      id: true,
      body: true,
      order: true,
      points: true,
      type: true,
      choices: {
        select: { id: true, body: true, order: true, isCorrect: true },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });
}

/**
 * Create a SINGLE_CHOICE or MULTI_CHOICE question with its choices in a single
 * transaction. The next `order` is computed inside the transaction to respect
 * the @@unique([quizId, order]) constraint under concurrent inserts.
 *
 * `correctChoiceIndexes` is the canonical input — a set of indices into
 * `choices` that should be marked isCorrect. Caller is responsible for
 * matching its semantics to the question type (the schema enforces exactly 1
 * for SINGLE_CHOICE and ≥1 for MULTI_CHOICE).
 */
export async function createQuestionWithChoices(input: {
  quizId: string;
  type: QuestionType;
  body: string;
  points: number;
  choices: { body: string }[];
  correctChoiceIndexes: number[];
}): Promise<{ questionId: string }> {
  const correctSet = new Set(input.correctChoiceIndexes);
  return prisma.$transaction(async (tx) => {
    const last = await tx.question.findFirst({
      where: { quizId: input.quizId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? 0) + 1;

    const question = await tx.question.create({
      data: {
        quizId: input.quizId,
        body: input.body,
        order: nextOrder,
        points: input.points,
        type: input.type,
        choices: {
          create: input.choices.map((choice, index) => ({
            body: choice.body,
            order: index + 1,
            isCorrect: correctSet.has(index),
          })),
        },
      },
      select: { id: true },
    });
    return { questionId: question.id };
  });
}

export async function findQuestionOwnedByInstructor(
  questionId: string,
  instructorId: string,
): Promise<{
  id: string;
  order: number;
  quizId: string;
  quiz: { id: string; course: { id: string; slug: string } };
} | null> {
  const row = await prisma.question.findFirst({
    where: {
      id: questionId,
      quiz: { lesson: { course: { instructorId } } },
    },
    select: {
      id: true,
      order: true,
      quizId: true,
      quiz: {
        select: {
          id: true,
          lesson: { select: { course: { select: { id: true, slug: true } } } },
        },
      },
    },
  });
  if (!row || !row.quiz.lesson) return null;
  return {
    id: row.id,
    order: row.order,
    quizId: row.quizId,
    quiz: { id: row.quiz.id, course: row.quiz.lesson.course },
  };
}

/**
 * Delete a question. Cascades via Prisma to its Choices, and to any Answer
 * that referenced this question (per schema: Question → Choice/Answer with
 * onDelete: Cascade). Attempts and Certificates persist — deleting one
 * question from a quiz doesn't invalidate prior attempts or credentials.
 */
export async function deleteQuestion(questionId: string): Promise<void> {
  await prisma.question.delete({ where: { id: questionId } });
}

export type ReorderQuestionsOutcome = { ok: true } | { ok: false; reason: 'SET_MISMATCH' };

/**
 * Reorder all questions of a quiz in one transaction. The caller must have
 * verified that `quizId` belongs to the acting instructor. Two-pass write
 * to respect `@@unique([quizId, order])`: offset by 100000, then assign 1..N.
 */
export async function reorderQuestions(
  quizId: string,
  orderedQuestionIds: string[],
): Promise<ReorderQuestionsOutcome> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.question.findMany({
      where: { quizId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((row) => row.id));
    if (existingIds.size !== orderedQuestionIds.length) {
      return { ok: false, reason: 'SET_MISMATCH' };
    }
    for (const id of orderedQuestionIds) {
      if (!existingIds.has(id)) return { ok: false, reason: 'SET_MISMATCH' };
    }

    for (const id of orderedQuestionIds) {
      await tx.question.update({
        where: { id },
        data: { order: { increment: 100000 } },
      });
    }
    for (let i = 0; i < orderedQuestionIds.length; i++) {
      await tx.question.update({
        where: { id: orderedQuestionIds[i] },
        data: { order: i + 1 },
      });
    }
    return { ok: true };
  });
}
