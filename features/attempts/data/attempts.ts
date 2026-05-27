import { prisma } from '@/lib/db';
import type { Attempt } from '@/lib/generated/prisma/client';

export type AttemptSummary = {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'ABANDONED' | 'PENDING_REVIEW';
  startedAt: Date;
  submittedAt: Date | null;
  score: number | null;
  passed: boolean | null;
};

export type SubmittedAttemptStatus = Exclude<AttemptSummary['status'], 'IN_PROGRESS'>;

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
  status: 'SUBMITTED' | 'PENDING_REVIEW';
  score: number | null;
  passed: boolean | null;
};

/**
 * Grade a quiz attempt and persist Answer rows, attempt score and pass/fail in
 * a single transaction.
 *
 * Supports SINGLE_CHOICE, MULTI_CHOICE, and TEXT question types.
 *
 * Scoring:
 * - SINGLE_CHOICE: learner picks exactly 1 choice. Correct iff that choice
 *   has isCorrect=true. Multi-pick on a single-choice question is rejected as
 *   INVALID_ANSWERS.
 * - MULTI_CHOICE: all-or-nothing. The set of selected choices must equal the
 *   set of correct choices exactly. Partial credit is intentionally out of scope.
 * - TEXT: no auto-grading. pointsAwarded=null, isCorrect=null stored.
 *
 * If the quiz contains at least one TEXT question the attempt is set to
 * PENDING_REVIEW with score=null, passed=null. The instructor must call
 * finalizeGradedAttempt (features/attempts/data/grading.ts) to complete
 * scoring.
 *
 * The caller is responsible for verifying that the attempt belongs to the
 * current user and is in IN_PROGRESS state; we re-check status inside the
 * transaction for TOCTOU safety.
 */
export async function gradeAndSubmitAttempt(input: {
  attemptId: string;
  userId: string;
  answers: { questionId: string; choiceIds?: string[]; textAnswer?: string }[];
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
                type: true,
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

    // Build per-question lookup tables.
    type QuestionLookup = {
      points: number;
      type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT';
      correctIds: Set<string>;
      allIds: Set<string>;
    };
    const questionMap = new Map<string, QuestionLookup>();
    for (const question of attempt.quiz.questions) {
      const correctIds = new Set<string>();
      const allIds = new Set<string>();
      for (const choice of question.choices) {
        allIds.add(choice.id);
        if (choice.isCorrect) correctIds.add(choice.id);
      }
      questionMap.set(question.id, {
        points: question.points,
        type: question.type,
        correctIds,
        allIds,
      });
    }

    // Validate each submitted answer.
    const seenQuestions = new Set<string>();
    for (const answer of input.answers) {
      const q = questionMap.get(answer.questionId);
      if (!q) return { error: 'INVALID_ANSWERS' as const };
      if (seenQuestions.has(answer.questionId)) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      seenQuestions.add(answer.questionId);

      const hasChoices = (answer.choiceIds?.length ?? 0) > 0;
      const hasText = (answer.textAnswer?.length ?? 0) > 0;

      if (q.type === 'TEXT') {
        // TEXT answers must have textAnswer only.
        if (!hasText || hasChoices) return { error: 'INVALID_ANSWERS' as const };
      } else {
        // Choice-based answers must have choiceIds only.
        if (!hasChoices || hasText) return { error: 'INVALID_ANSWERS' as const };

        const choiceIds = answer.choiceIds;
        if (!choiceIds || choiceIds.length === 0) {
          return { error: 'INVALID_ANSWERS' as const };
        }

        // SINGLE_CHOICE allows only one selection.
        if (q.type === 'SINGLE_CHOICE' && choiceIds.length !== 1) {
          return { error: 'INVALID_ANSWERS' as const };
        }

        // No duplicate choiceIds within one answer.
        const submittedSet = new Set(choiceIds);
        if (submittedSet.size !== choiceIds.length) {
          return { error: 'INVALID_ANSWERS' as const };
        }

        // Every submitted choice must belong to the question.
        for (const choiceId of choiceIds) {
          if (!q.allIds.has(choiceId)) return { error: 'INVALID_ANSWERS' as const };
        }
      }
    }

    // Determine whether any TEXT question exists in this quiz.
    const hasTextQuestion = attempt.quiz.questions.some((q) => q.type === 'TEXT');

    // Per-question scoring and answer records.
    type ChoiceAnswerRecord = {
      questionId: string;
      choiceIds: string[];
      isCorrect: boolean;
      pointsAwarded: number;
    };
    type TextAnswerRecord = {
      questionId: string;
      textAnswer: string;
    };

    const choiceAnswerRecords: ChoiceAnswerRecord[] = [];
    const textAnswerRecords: TextAnswerRecord[] = [];

    let autoEarned = 0;

    for (const question of attempt.quiz.questions) {
      const submitted = input.answers.find((a) => a.questionId === question.id);
      if (!submitted) continue;

      const q = questionMap.get(question.id)!;

      if (q.type === 'TEXT') {
        const text = submitted.textAnswer;
        if (text === undefined || text === null) {
          return { error: 'INVALID_ANSWERS' as const };
        }
        textAnswerRecords.push({
          questionId: question.id,
          textAnswer: text,
        });
      } else {
        const choiceIds = submitted.choiceIds;
        if (!choiceIds || choiceIds.length === 0) {
          return { error: 'INVALID_ANSWERS' as const };
        }
        const submittedSet = new Set(choiceIds);

        // All-or-nothing equality between submitted and correct sets.
        let isCorrect = submittedSet.size === q.correctIds.size;
        if (isCorrect) {
          for (const correctId of q.correctIds) {
            if (!submittedSet.has(correctId)) {
              isCorrect = false;
              break;
            }
          }
        }

        const pointsAwarded = isCorrect ? question.points : 0;
        autoEarned += pointsAwarded;
        choiceAnswerRecords.push({
          questionId: question.id,
          choiceIds,
          isCorrect,
          pointsAwarded,
        });
      }
    }

    // Persist Answer rows for choice-based questions.
    for (const record of choiceAnswerRecords) {
      await tx.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: record.questionId,
          isCorrect: record.isCorrect,
          pointsAwarded: record.pointsAwarded,
          selectedChoices: {
            connect: record.choiceIds.map((id) => ({ id })),
          },
        },
      });
    }

    // Persist Answer rows for TEXT questions (unscored).
    for (const record of textAnswerRecords) {
      await tx.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: record.questionId,
          textAnswer: record.textAnswer,
          isCorrect: null,
          pointsAwarded: null,
        },
      });
    }

    if (hasTextQuestion) {
      // Defer final scoring to instructor review.
      await tx.attempt.update({
        where: { id: attempt.id },
        data: {
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
          score: null,
          passed: null,
        },
      });
      return {
        attemptId: attempt.id,
        status: 'PENDING_REVIEW',
        score: null,
        passed: null,
      } satisfies SubmitOutcome;
    }

    // All questions are choice-based — auto-grade now.
    const possible = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const score = possible === 0 ? 0 : Math.round((autoEarned / possible) * 100);
    const passed = possible > 0 && score >= attempt.quiz.passingScore;

    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        score,
        passed,
      },
    });

    return {
      attemptId: attempt.id,
      status: 'SUBMITTED',
      score,
      passed,
    } satisfies SubmitOutcome;
  });
}

export type AnswerForResult = {
  questionId: string;
  isCorrect: boolean | null;
  pointsAwarded: number | null;
  selectedChoiceIds: string[];
  textAnswer: string | null;
};

export async function listAnswersByAttempt(attemptId: string): Promise<AnswerForResult[]> {
  const rows = await prisma.answer.findMany({
    where: { attemptId },
    select: {
      questionId: true,
      isCorrect: true,
      pointsAwarded: true,
      textAnswer: true,
      selectedChoices: { select: { id: true } },
    },
  });
  return rows.map((row) => ({
    questionId: row.questionId,
    isCorrect: row.isCorrect,
    pointsAwarded: row.pointsAwarded,
    textAnswer: row.textAnswer,
    selectedChoiceIds: row.selectedChoices.map((c) => c.id),
  }));
}
