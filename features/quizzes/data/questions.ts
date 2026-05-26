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
