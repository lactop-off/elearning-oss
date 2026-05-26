import { prisma } from '@/lib/db';
import type { Attempt } from '@/lib/generated/prisma/client';

export type AttemptSummary = {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'ABANDONED';
  startedAt: Date;
  submittedAt: Date | null;
  score: number | null;
  passed: boolean | null;
};

export async function findLatestAttempt(
  userId: string,
  quizId: string,
): Promise<AttemptSummary | null> {
  return prisma.attempt.findFirst({
    where: { userId, quizId },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      passed: true,
    },
    orderBy: { startedAt: 'desc' },
  });
}

export async function findInProgressAttempt(
  userId: string,
  quizId: string,
): Promise<AttemptSummary | null> {
  return prisma.attempt.findFirst({
    where: { userId, quizId, status: 'IN_PROGRESS' },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      score: true,
      passed: true,
    },
    orderBy: { startedAt: 'desc' },
  });
}

export async function findAttemptOwnedBy(
  attemptId: string,
  userId: string,
): Promise<{
  id: string;
  quizId: string;
  status: AttemptSummary['status'];
  score: number | null;
  passed: boolean | null;
  submittedAt: Date | null;
} | null> {
  return prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      quizId: true,
      status: true,
      score: true,
      passed: true,
      submittedAt: true,
    },
  });
}

export async function startAttempt(userId: string, quizId: string): Promise<Attempt> {
  return prisma.attempt.create({
    data: { userId, quizId, status: 'IN_PROGRESS' },
  });
}

export type SubmitOutcome = {
  attemptId: string;
  score: number;
  passed: boolean;
};

/**
 * Grade a SINGLE_CHOICE quiz attempt and persist Answer rows, attempt score
 * and pass/fail in a single transaction. Returns the final score (0-100) and
 * pass result.
 *
 * The caller is responsible for verifying that the attempt belongs to the
 * current user and is in IN_PROGRESS state. This function refuses to grade an
 * already-submitted attempt by checking status inside the transaction.
 */
export async function gradeAndSubmitAttempt(input: {
  attemptId: string;
  userId: string;
  answers: { questionId: string; choiceId: string }[];
}): Promise<SubmitOutcome | { error: 'NOT_IN_PROGRESS' | 'INVALID_ANSWERS' }> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: { id: input.attemptId, userId: input.userId },
      select: {
        id: true,
        status: true,
        quizId: true,
        quiz: {
          select: {
            passingScore: true,
            questions: {
              select: {
                id: true,
                points: true,
                choices: { select: { id: true, isCorrect: true } },
              },
            },
          },
        },
      },
    });
    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      return { error: 'NOT_IN_PROGRESS' as const };
    }

    // Build maps for grading and validate every submitted answer references a
    // question and choice that actually belong to this quiz.
    const questionMap = new Map<
      string,
      { points: number; correctChoiceId: string | null; choiceIds: Set<string> }
    >();
    for (const question of attempt.quiz.questions) {
      const correct = question.choices.find((c) => c.isCorrect);
      questionMap.set(question.id, {
        points: question.points,
        correctChoiceId: correct?.id ?? null,
        choiceIds: new Set(question.choices.map((c) => c.id)),
      });
    }

    const seenQuestions = new Set<string>();
    for (const answer of input.answers) {
      const question = questionMap.get(answer.questionId);
      if (!question || !question.choiceIds.has(answer.choiceId)) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      if (seenQuestions.has(answer.questionId)) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      seenQuestions.add(answer.questionId);
    }

    let earned = 0;
    let possible = 0;
    const answerRecords: {
      questionId: string;
      choiceId: string;
      isCorrect: boolean;
      pointsAwarded: number;
    }[] = [];

    for (const question of attempt.quiz.questions) {
      possible += question.points;
      const submitted = input.answers.find((a) => a.questionId === question.id);
      if (!submitted) {
        // Unanswered question counts as 0.
        continue;
      }
      const isCorrect = submitted.choiceId === questionMap.get(question.id)?.correctChoiceId;
      const pointsAwarded = isCorrect ? question.points : 0;
      earned += pointsAwarded;
      answerRecords.push({
        questionId: question.id,
        choiceId: submitted.choiceId,
        isCorrect,
        pointsAwarded,
      });
    }

    const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
    const passed = possible > 0 && score >= attempt.quiz.passingScore;

    for (const record of answerRecords) {
      await tx.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: record.questionId,
          isCorrect: record.isCorrect,
          pointsAwarded: record.pointsAwarded,
          selectedChoices: { connect: { id: record.choiceId } },
        },
      });
    }

    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        score,
        passed,
      },
    });

    return { attemptId: attempt.id, score, passed } satisfies SubmitOutcome;
  });
}

export type AnswerForResult = {
  questionId: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  selectedChoiceIds: string[];
};

export async function listAnswersByAttempt(attemptId: string): Promise<AnswerForResult[]> {
  const rows = await prisma.answer.findMany({
    where: { attemptId },
    select: {
      questionId: true,
      isCorrect: true,
      pointsAwarded: true,
      selectedChoices: { select: { id: true } },
    },
  });
  return rows.map((row) => ({
    questionId: row.questionId,
    isCorrect: row.isCorrect,
    pointsAwarded: row.pointsAwarded,
    selectedChoiceIds: row.selectedChoices.map((c) => c.id),
  }));
}
