import { prisma } from '@/lib/db';
import type { Choice, Question } from '@/lib/generated/prisma/client';

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
 * Create a SINGLE_CHOICE question with its choices in a single transaction.
 * The next `order` is computed inside the transaction to respect the
 * @@unique([quizId, order]) constraint under concurrent inserts.
 */
export async function createSingleChoiceQuestion(input: {
  quizId: string;
  body: string;
  points: number;
  choices: { body: string }[];
  correctChoiceIndex: number;
}): Promise<{ questionId: string }> {
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
        type: 'SINGLE_CHOICE',
        choices: {
          create: input.choices.map((choice, index) => ({
            body: choice.body,
            order: index + 1,
            isCorrect: index === input.correctChoiceIndex,
          })),
        },
      },
      select: { id: true },
    });
    return { questionId: question.id };
  });
}
