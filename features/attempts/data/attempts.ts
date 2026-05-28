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
  // When `pending` is true (one or more TEXT answers are waiting for
  // instructor grading), score and passed are null and the final values
  // will be set after manual grading completes.
  score: number | null;
  passed: boolean | null;
  pending: boolean;
};

/**
 * Grade a quiz attempt and persist Answer rows, attempt score and pass/fail
 * in a single transaction.
 *
 * Scoring:
 * - SINGLE_CHOICE: learner picks exactly 1 choice. Correct iff that choice
 *   has isCorrect=true. Multi-pick on a single-choice question is rejected as
 *   INVALID_ANSWERS.
 * - MULTI_CHOICE: all-or-nothing. The set of selected choices must equal the
 *   set of correct choices exactly (no missing, no extras). Partial credit is
 *   intentionally out of scope.
 * - TEXT: stored as free text with `isCorrect=null` and `pointsAwarded=null`.
 *   The instructor grades these manually. If any TEXT answer is submitted,
 *   the attempt's `score` and `passed` stay null until grading completes.
 *
 * Answers must carry exactly one of `choiceIds` (for choice questions) or
 * `textAnswer` (for TEXT questions); the input schema already enforces this,
 * we re-check defensively. The caller is responsible for verifying the
 * attempt belongs to the current user; we re-check IN_PROGRESS status inside
 * the transaction for TOCTOU safety.
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

    // Build per-question lookup tables: total points, correct/all choice
    // id sets (for validating choice answers), and the question's type.
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

    // Validate each submitted answer (defense-in-depth on top of the Zod
    // schema): one entry per question, payload matches question type, no
    // unknown choice ids, no duplicates.
    const seenQuestions = new Set<string>();
    for (const answer of input.answers) {
      const q = questionMap.get(answer.questionId);
      if (!q) return { error: 'INVALID_ANSWERS' as const };
      if (seenQuestions.has(answer.questionId)) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      seenQuestions.add(answer.questionId);

      const hasChoices = answer.choiceIds !== undefined && answer.choiceIds.length > 0;
      const hasText = answer.textAnswer !== undefined && answer.textAnswer.length > 0;
      if (hasChoices === hasText) {
        // Either both or neither — invalid in either case.
        return { error: 'INVALID_ANSWERS' as const };
      }

      if (q.type === 'TEXT') {
        if (!hasText) return { error: 'INVALID_ANSWERS' as const };
        continue;
      }

      // CHOICE question must carry choiceIds.
      if (!hasChoices) return { error: 'INVALID_ANSWERS' as const };
      const choiceIds = answer.choiceIds!;

      if (q.type === 'SINGLE_CHOICE' && choiceIds.length !== 1) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      const submittedSet = new Set(choiceIds);
      if (submittedSet.size !== choiceIds.length) {
        return { error: 'INVALID_ANSWERS' as const };
      }
      for (const choiceId of choiceIds) {
        if (!q.allIds.has(choiceId)) return { error: 'INVALID_ANSWERS' as const };
      }
    }

    let earned = 0;
    let possible = 0;
    let hasPendingText = false;
    type AnswerRecord = {
      questionId: string;
      choiceIds: string[];
      textAnswer: string | null;
      isCorrect: boolean | null;
      pointsAwarded: number | null;
    };
    const answerRecords: AnswerRecord[] = [];

    for (const question of attempt.quiz.questions) {
      possible += question.points;
      const submitted = input.answers.find((a) => a.questionId === question.id);
      if (!submitted) {
        // Unanswered counts as 0; no Answer row created.
        continue;
      }
      const q = questionMap.get(question.id)!;

      if (q.type === 'TEXT') {
        hasPendingText = true;
        answerRecords.push({
          questionId: question.id,
          choiceIds: [],
          textAnswer: submitted.textAnswer ?? '',
          isCorrect: null,
          pointsAwarded: null,
        });
        continue;
      }

      const choiceIds = submitted.choiceIds!;
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
      earned += pointsAwarded;
      answerRecords.push({
        questionId: question.id,
        choiceIds,
        textAnswer: null,
        isCorrect,
        pointsAwarded,
      });
    }

    // If any TEXT answer is pending, leave score/passed null on the attempt.
    // Otherwise compute the final score from the choice answers.
    const finalScore = hasPendingText
      ? null
      : possible === 0
        ? 0
        : Math.round((earned / possible) * 100);
    const finalPassed = hasPendingText
      ? null
      : possible > 0 && (finalScore ?? 0) >= attempt.quiz.passingScore;

    for (const record of answerRecords) {
      await tx.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: record.questionId,
          textAnswer: record.textAnswer,
          isCorrect: record.isCorrect,
          pointsAwarded: record.pointsAwarded,
          selectedChoices:
            record.choiceIds.length > 0
              ? { connect: record.choiceIds.map((id) => ({ id })) }
              : undefined,
        },
      });
    }

    await tx.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        score: finalScore,
        passed: finalPassed,
      },
    });

    return {
      attemptId: attempt.id,
      score: finalScore,
      passed: finalPassed,
      pending: hasPendingText,
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

// ─── Manual grading (instructor) ─────────────────────────────────────

export type PendingAttemptSummary = {
  attemptId: string;
  learnerName: string;
  submittedAt: Date | null;
  textAnswerCount: number;
};

/**
 * List attempts that are awaiting instructor grading for a quiz the
 * instructor owns. An attempt is "pending" when it was submitted but the
 * final pass/fail is still null (at least one TEXT answer hasn't been
 * graded yet).
 */
export async function listPendingAttemptsForQuizOwnedBy(
  quizId: string,
  instructorId: string,
): Promise<PendingAttemptSummary[]> {
  const rows = await prisma.attempt.findMany({
    where: {
      quizId,
      passed: null,
      status: 'SUBMITTED',
      quiz: { lesson: { course: { instructorId } } },
    },
    select: {
      id: true,
      submittedAt: true,
      user: { select: { name: true } },
      answers: { where: { isCorrect: null }, select: { id: true } },
    },
    orderBy: { submittedAt: 'asc' },
  });
  return rows.map((row) => ({
    attemptId: row.id,
    learnerName: row.user.name ?? '',
    submittedAt: row.submittedAt,
    textAnswerCount: row.answers.length,
  }));
}

export type GradingAnswer = {
  answerId: string;
  questionId: string;
  questionBody: string;
  questionPoints: number;
  modelAnswer: string | null;
  textAnswer: string;
  currentIsCorrect: boolean | null;
  currentPointsAwarded: number | null;
};

export type AttemptForGrading = {
  attemptId: string;
  userId: string;
  learnerName: string;
  submittedAt: Date | null;
  quizId: string;
  quizTitle: string;
  passingScore: number;
  courseId: string;
  courseSlug: string;
  textAnswers: GradingAnswer[];
};

/**
 * Load a pending attempt for grading, scoped to a quiz owned by this
 * instructor. Returns only the TEXT answers (the choice answers are already
 * scored). Returns null if not found or already finalised.
 */
export async function findAttemptForGradingOwnedBy(
  attemptId: string,
  instructorId: string,
): Promise<AttemptForGrading | null> {
  const row = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      passed: null,
      status: 'SUBMITTED',
      quiz: { lesson: { course: { instructorId } } },
    },
    select: {
      id: true,
      userId: true,
      submittedAt: true,
      quizId: true,
      user: { select: { name: true } },
      quiz: {
        select: {
          title: true,
          passingScore: true,
          lesson: {
            select: { course: { select: { id: true, slug: true } } },
          },
        },
      },
      answers: {
        where: { question: { type: 'TEXT' } },
        select: {
          id: true,
          textAnswer: true,
          isCorrect: true,
          pointsAwarded: true,
          question: {
            select: {
              id: true,
              body: true,
              points: true,
              modelAnswer: true,
            },
          },
        },
      },
    },
  });
  if (!row || !row.quiz.lesson) return null;

  return {
    attemptId: row.id,
    userId: row.userId,
    learnerName: row.user.name ?? '',
    submittedAt: row.submittedAt,
    quizId: row.quizId,
    quizTitle: row.quiz.title,
    passingScore: row.quiz.passingScore,
    courseId: row.quiz.lesson.course.id,
    courseSlug: row.quiz.lesson.course.slug,
    textAnswers: row.answers.map((a) => ({
      answerId: a.id,
      questionId: a.question.id,
      questionBody: a.question.body,
      questionPoints: a.question.points,
      modelAnswer: a.question.modelAnswer,
      textAnswer: a.textAnswer ?? '',
      currentIsCorrect: a.isCorrect,
      currentPointsAwarded: a.pointsAwarded,
    })),
  };
}

export type GradeAttemptOutcome = {
  attemptId: string;
  score: number;
  passed: boolean;
  courseSlug: string;
  userId: string;
  courseId: string;
};

/**
 * Apply instructor's manual gradings to all TEXT answers in an attempt and
 * finalise score/passed in a single transaction. The caller must verify
 * ownership; we re-check inside the transaction for TOCTOU safety. The
 * caller is responsible for triggering the completion check after this
 * returns successfully (out-of-band so completion failures don't roll back
 * the grade).
 */
export async function gradeAttemptAnswers(input: {
  attemptId: string;
  instructorId: string;
  gradings: { answerId: string; isCorrect: boolean; pointsAwarded: number }[];
}): Promise<
  | GradeAttemptOutcome
  | { error: 'NOT_FOUND' | 'NOT_PENDING' | 'INVALID_GRADINGS' | 'POINTS_EXCEED' }
> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: {
        id: input.attemptId,
        passed: null,
        status: 'SUBMITTED',
        quiz: { lesson: { course: { instructorId: input.instructorId } } },
      },
      select: {
        id: true,
        userId: true,
        quizId: true,
        quiz: {
          select: {
            passingScore: true,
            lesson: { select: { course: { select: { id: true, slug: true } } } },
            questions: { select: { id: true, points: true } },
          },
        },
        answers: {
          select: {
            id: true,
            isCorrect: true,
            pointsAwarded: true,
            question: { select: { id: true, type: true, points: true } },
          },
        },
      },
    });
    if (!attempt || !attempt.quiz.lesson) {
      // either doesn't exist or already finalised, or wrong instructor.
      return { error: 'NOT_FOUND' as const };
    }

    // The unfinalised TEXT answers we need to grade.
    const pendingTextAnswers = attempt.answers.filter(
      (a) => a.question.type === 'TEXT' && a.isCorrect === null,
    );

    // Every pending TEXT answer must be present in the gradings input
    // exactly once, and every grading must target a pending TEXT answer.
    if (input.gradings.length !== pendingTextAnswers.length) {
      return { error: 'INVALID_GRADINGS' as const };
    }
    const pendingIds = new Set(pendingTextAnswers.map((a) => a.id));
    const seen = new Set<string>();
    for (const g of input.gradings) {
      if (!pendingIds.has(g.answerId)) return { error: 'INVALID_GRADINGS' as const };
      if (seen.has(g.answerId)) return { error: 'INVALID_GRADINGS' as const };
      seen.add(g.answerId);
    }

    // pointsAwarded must not exceed the question's points.
    const answerById = new Map(attempt.answers.map((a) => [a.id, a]));
    for (const g of input.gradings) {
      const a = answerById.get(g.answerId)!;
      if (g.pointsAwarded > a.question.points) {
        return { error: 'POINTS_EXCEED' as const };
      }
      // Correct iff full points, incorrect iff < full points.
      if (g.isCorrect && g.pointsAwarded !== a.question.points) {
        return { error: 'INVALID_GRADINGS' as const };
      }
      if (!g.isCorrect && g.pointsAwarded === a.question.points) {
        return { error: 'INVALID_GRADINGS' as const };
      }
    }

    // Apply gradings.
    for (const g of input.gradings) {
      await tx.answer.update({
        where: { id: g.answerId },
        data: { isCorrect: g.isCorrect, pointsAwarded: g.pointsAwarded },
      });
    }

    // Recompute attempt score from the now-complete answer set.
    const possible = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);
    // Build a map of the latest awarded points per answer (combining the
    // pre-existing choice grades with our just-applied text grades).
    const gradedById = new Map<string, number>();
    for (const a of attempt.answers) gradedById.set(a.id, a.pointsAwarded ?? 0);
    for (const g of input.gradings) gradedById.set(g.answerId, g.pointsAwarded);
    let earned = 0;
    for (const value of gradedById.values()) earned += value;
    const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
    const passed = possible > 0 && score >= attempt.quiz.passingScore;

    await tx.attempt.update({
      where: { id: attempt.id },
      data: { score, passed },
    });

    return {
      attemptId: attempt.id,
      score,
      passed,
      courseSlug: attempt.quiz.lesson.course.slug,
      userId: attempt.userId,
      courseId: attempt.quiz.lesson.course.id,
    } satisfies GradeAttemptOutcome;
  });
}
