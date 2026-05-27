import { prisma } from '@/lib/db';

// ─── Return types ────────────────────────────────────────────────────────────

export type PendingReviewItem = {
  attemptId: string;
  learnerName: string;
  quizTitle: string;
  courseSlug: string;
  submittedAt: Date;
};

export type AttemptForGrading = {
  attemptId: string;
  quizTitle: string;
  passingScore: number;
  /** Points earned on auto-graded (choice-based) questions. */
  autoEarned: number;
  /** Total possible points for auto-graded questions. */
  autoPossible: number;
  textItems: {
    questionId: string;
    body: string;
    points: number;
    textAnswer: string | null;
    pointsAwarded: number | null;
  }[];
};

export type FinalizeGradingResult =
  | { learnerUserId: string; courseId: string; score: number; passed: boolean }
  | {
      error: 'NOT_FOUND' | 'NOT_OWNED' | 'NOT_PENDING' | 'INVALID_GRADES';
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the courseId for a quiz. A quiz is attached either to a lesson
 * (lesson.courseId) or directly to a course (quiz.courseId). Returns null when
 * neither relation is populated — that should not happen in a well-formed DB.
 */
function resolveCourseId(quiz: {
  courseId: string | null;
  lesson: { courseId: string } | null;
}): string | null {
  return quiz.lesson?.courseId ?? quiz.courseId ?? null;
}

/**
 * Return true when the given instructor owns the course that contains this
 * quiz. Ownership is via lesson→course.instructorId (LessonQuiz) **or**
 * quiz→course.instructorId (CourseQuiz).
 */
function isQuizOwnedByInstructor(
  quiz: {
    lesson: { course: { instructorId: string } } | null;
    course: { instructorId: string } | null;
  },
  instructorId: string,
): boolean {
  return (
    quiz.lesson?.course.instructorId === instructorId || quiz.course?.instructorId === instructorId
  );
}

// ─── listPendingReviewForInstructor ──────────────────────────────────────────

/**
 * Return all PENDING_REVIEW attempts whose quiz belongs to a course owned by
 * `instructorId`, ordered by submittedAt desc.
 */
export async function listPendingReviewForInstructor(
  instructorId: string,
): Promise<PendingReviewItem[]> {
  const rows = await prisma.attempt.findMany({
    where: {
      status: 'PENDING_REVIEW',
      quiz: {
        OR: [{ lesson: { course: { instructorId } } }, { course: { instructorId } }],
      },
    },
    select: {
      id: true,
      submittedAt: true,
      user: { select: { name: true } },
      quiz: {
        select: {
          title: true,
          lesson: { select: { course: { select: { slug: true } } } },
          course: { select: { slug: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  return rows
    .map((row) => {
      const courseSlug = row.quiz.lesson?.course.slug ?? row.quiz.course?.slug;
      if (!courseSlug || !row.submittedAt) return null;
      return {
        attemptId: row.id,
        learnerName: row.user.name ?? 'Unknown',
        quizTitle: row.quiz.title,
        courseSlug,
        submittedAt: row.submittedAt,
      };
    })
    .filter((item): item is PendingReviewItem => item !== null);
}

// ─── findAttemptForGrading ───────────────────────────────────────────────────

/**
 * Load a PENDING_REVIEW attempt for the grading UI. Verifies instructor
 * ownership. Returns null when not found, not owned, or not PENDING_REVIEW.
 */
export async function findAttemptForGrading(
  attemptId: string,
  instructorId: string,
): Promise<AttemptForGrading | null> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, status: 'PENDING_REVIEW' },
    select: {
      id: true,
      quiz: {
        select: {
          title: true,
          passingScore: true,
          courseId: true,
          lesson: {
            select: {
              courseId: true,
              course: { select: { instructorId: true } },
            },
          },
          course: { select: { instructorId: true } },
          questions: {
            select: { id: true, type: true, points: true, body: true },
          },
        },
      },
      answers: {
        select: {
          questionId: true,
          textAnswer: true,
          isCorrect: true,
          pointsAwarded: true,
        },
      },
    },
  });

  if (!attempt) return null;
  if (!isQuizOwnedByInstructor(attempt.quiz, instructorId)) return null;

  const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

  let autoEarned = 0;
  let autoPossible = 0;
  const textItems: AttemptForGrading['textItems'] = [];

  for (const question of attempt.quiz.questions) {
    if (question.type === 'TEXT') {
      const answer = answerMap.get(question.id);
      textItems.push({
        questionId: question.id,
        body: question.body,
        points: question.points,
        textAnswer: answer?.textAnswer ?? null,
        pointsAwarded: answer?.pointsAwarded ?? null,
      });
    } else {
      // Choice-based: sum up auto-graded results.
      const answer = answerMap.get(question.id);
      autoPossible += question.points;
      autoEarned += answer?.pointsAwarded ?? 0;
    }
  }

  return {
    attemptId: attempt.id,
    quizTitle: attempt.quiz.title,
    passingScore: attempt.quiz.passingScore,
    autoEarned,
    autoPossible,
    textItems,
  };
}

// ─── finalizeGradedAttempt ───────────────────────────────────────────────────

/**
 * Apply instructor grades to all TEXT answers in one transaction, then
 * recompute the attempt's total score and passed/failed status.
 *
 * Validation inside the transaction:
 * - Attempt must exist and be PENDING_REVIEW.
 * - Instructor must own the quiz's course.
 * - `grades` must cover every TEXT question in the quiz — no more, no less.
 * - Each grade's pointsAwarded must be within [0, question.points].
 *
 * On success returns `{ learnerUserId, courseId, score, passed }` so the
 * action layer can trigger the completion check.
 */
export async function finalizeGradedAttempt(input: {
  attemptId: string;
  instructorId: string;
  grades: { questionId: string; pointsAwarded: number }[];
}): Promise<FinalizeGradingResult> {
  return prisma.$transaction(async (tx) => {
    // ── 1. Load attempt with full context ──────────────────────────────
    const attempt = await tx.attempt.findFirst({
      where: { id: input.attemptId },
      select: {
        id: true,
        userId: true,
        status: true,
        quiz: {
          select: {
            passingScore: true,
            courseId: true,
            lesson: {
              select: {
                courseId: true,
                course: { select: { instructorId: true } },
              },
            },
            course: { select: { instructorId: true } },
            questions: {
              select: { id: true, type: true, points: true },
            },
          },
        },
        answers: {
          select: {
            id: true,
            questionId: true,
            textAnswer: true,
            pointsAwarded: true,
          },
        },
      },
    });

    if (!attempt) return { error: 'NOT_FOUND' as const };

    // ── 2. Ownership check ────────────────────────────────────────────
    if (!isQuizOwnedByInstructor(attempt.quiz, input.instructorId)) {
      return { error: 'NOT_OWNED' as const };
    }

    // ── 3. Status guard ───────────────────────────────────────────────
    if (attempt.status !== 'PENDING_REVIEW') {
      return { error: 'NOT_PENDING' as const };
    }

    // ── 4. Grade validation ───────────────────────────────────────────
    // Build a map of TEXT questions for this quiz.
    const textQuestions = new Map(
      attempt.quiz.questions.filter((q) => q.type === 'TEXT').map((q) => [q.id, q]),
    );

    // Every TEXT question must appear in grades, no extras allowed.
    if (input.grades.length !== textQuestions.size) {
      return { error: 'INVALID_GRADES' as const };
    }
    const gradedIds = new Set<string>();
    for (const grade of input.grades) {
      const question = textQuestions.get(grade.questionId);
      if (!question) return { error: 'INVALID_GRADES' as const };
      if (gradedIds.has(grade.questionId)) {
        return { error: 'INVALID_GRADES' as const };
      }
      gradedIds.add(grade.questionId);
      if (grade.pointsAwarded < 0 || grade.pointsAwarded > question.points) {
        return { error: 'INVALID_GRADES' as const };
      }
    }

    // ── 5. Upsert Answer rows for TEXT questions ───────────────────────
    // Build a lookup from questionId → existing Answer.id (if present).
    const existingAnswerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));

    for (const grade of input.grades) {
      const existing = existingAnswerMap.get(grade.questionId);
      const question = textQuestions.get(grade.questionId);
      if (!question) return { error: 'INVALID_GRADES' as const };
      const isCorrect =
        grade.pointsAwarded === question.points ? true : grade.pointsAwarded === 0 ? false : null;

      if (existing) {
        await tx.answer.update({
          where: { id: existing.id },
          data: { pointsAwarded: grade.pointsAwarded, isCorrect },
        });
      } else {
        // Learner submitted without providing a text answer for this question
        // (should not happen if submission validation is sound, but handled
        // defensively).
        await tx.answer.create({
          data: {
            attemptId: attempt.id,
            questionId: grade.questionId,
            textAnswer: null,
            pointsAwarded: grade.pointsAwarded,
            isCorrect,
          },
        });
      }
    }

    // ── 6. Recompute total score ───────────────────────────────────────
    // Fetch all answers fresh so we include both auto and manually graded.
    const allAnswers = await tx.answer.findMany({
      where: { attemptId: attempt.id },
      select: { questionId: true, pointsAwarded: true },
    });

    const answerPointsMap = new Map(allAnswers.map((a) => [a.questionId, a.pointsAwarded ?? 0]));

    let earned = 0;
    let possible = 0;
    for (const question of attempt.quiz.questions) {
      possible += question.points;
      earned += answerPointsMap.get(question.id) ?? 0;
    }

    const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);
    const passed = possible > 0 && score >= attempt.quiz.passingScore;

    await tx.attempt.update({
      where: { id: attempt.id },
      data: { status: 'SUBMITTED', score, passed },
    });

    // ── 7. Resolve courseId for caller ───────────────────────────────
    const courseId = resolveCourseId(attempt.quiz);
    if (!courseId) {
      // Defensive: quiz has no course association — cannot trigger completion.
      // We still mark the attempt SUBMITTED and return a partial result.
      return {
        learnerUserId: attempt.userId,
        courseId: '',
        score,
        passed,
      };
    }

    return {
      learnerUserId: attempt.userId,
      courseId,
      score,
      passed,
    };
  });
}
