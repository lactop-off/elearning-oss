import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  countCompletedAttempts,
  findAttemptOwnedBy,
  findLatestAttempt,
  listAnswersByAttempt,
} from '@/features/attempts/data/attempts';
import { QuizResult } from '@/features/attempts/components/quiz-result';
import { QuizTaker } from '@/features/attempts/components/quiz-taker';
import { StartQuizButton } from '@/features/attempts/components/start-quiz-button';
import { findEnrolledCourseBySlug } from '@/features/enrollments/data/enrollments';
import { listQuestionsByQuiz } from '@/features/quizzes/data/questions';
import { findQuizForLearner } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireUser } from '@/lib/auth';
import { shuffleDeterministic } from '@/lib/shuffle';

export default async function LearnerQuizPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; quizId: string }>;
}) {
  const { locale, slug, quizId } = await params;
  setRequestLocale(locale);

  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: '/sign-in', locale });
    }
    throw e;
  }

  // Confirm enrollment via the course; this also gates the quiz lookup.
  const enrollment = await findEnrolledCourseBySlug(user.id, slug);
  if (!enrollment) notFound();

  const quiz = await findQuizForLearner(slug, quizId, user.id);
  if (!quiz) notFound();

  const latestAttempt = await findLatestAttempt(user.id, quiz.id);
  const [t, tStart] = await Promise.all([
    getTranslations('attempts.page'),
    getTranslations('attempts.start'),
  ]);

  // Compute remaining attempts only when a cap is set. IN_PROGRESS attempts
  // never count, matching the action-side enforcement.
  const completedCount =
    quiz.maxAttempts !== null
      ? await countCompletedAttempts(user.id, quiz.id)
      : 0;
  const attemptsExhausted =
    quiz.maxAttempts !== null && completedCount >= quiz.maxAttempts;

  // The result view needs the answer key. We fetch with isCorrect ONLY for
  // submitted attempts (the answer key never reaches the wire while taking).
  let resultPayload: Awaited<
    ReturnType<typeof loadResultPayload>
  > | null = null;
  if (latestAttempt && latestAttempt.status !== 'IN_PROGRESS') {
    const attempt = await findAttemptOwnedBy(latestAttempt.id, user.id);
    if (attempt) {
      resultPayload = await loadResultPayload(quiz.id, latestAttempt.id);
    }
  }

  // Apply shuffle when configured. Seed by attemptId+questionId so the
  // ordering is stable within an attempt and different across attempts.
  const presentedQuestions =
    quiz.shuffleChoices && latestAttempt
      ? quiz.questions.map((question) => ({
          ...question,
          choices: shuffleDeterministic(
            question.choices,
            `${latestAttempt.id}-${question.id}`,
          ),
        }))
      : quiz.questions;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/learn/${slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { courseTitle: enrollment.course.title })}
        </Link>
      </p>

      <Card>
        <CardHeader>
          <CardTitle asChild className="text-2xl font-semibold tracking-tight">
            <h1>{quiz.title}</h1>
          </CardTitle>
          <CardDescription>
            {t('meta', {
              questions: quiz.questions.length,
              passing: quiz.passingScore,
              required: quiz.isRequired ? t('isRequired') : t('isOptional'),
            })}
          </CardDescription>
          {quiz.maxAttempts !== null ? (
            <p className="text-xs text-muted-foreground">
              {tStart('attemptsUsed', {
                used: completedCount,
                max: quiz.maxAttempts,
              })}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-6">
          {quiz.description ? (
            <p className="text-sm text-muted-foreground">{quiz.description}</p>
          ) : null}

          {quiz.questions.length === 0 ? (
            <p role="status" className="text-sm text-muted-foreground">
              {t('noQuestions')}
            </p>
          ) : !latestAttempt ? (
            attemptsExhausted ? (
              <p role="status" className="text-sm text-muted-foreground">
                {tStart('maxReached')}
              </p>
            ) : (
              <div className="grid gap-2">
                <p className="text-sm">{t('readyPrompt')}</p>
                <div>
                  <StartQuizButton
                    courseSlug={slug}
                    quizId={quiz.id}
                    label={t('startCta')}
                  />
                </div>
              </div>
            )
          ) : latestAttempt.status === 'IN_PROGRESS' ? (
            <QuizTaker
              courseSlug={slug}
              attemptId={latestAttempt.id}
              questions={presentedQuestions}
            />
          ) : resultPayload ? (
            <div className="grid gap-6">
              <QuizResult
                score={latestAttempt.score}
                passed={latestAttempt.passed}
                passingScore={quiz.passingScore}
                questions={presentedQuestions}
                answers={resultPayload.answers}
                correctChoiceIdsByQuestionId={resultPayload.correctChoiceIdsByQuestionId}
              />
              <div>
                {attemptsExhausted ? (
                  <p role="status" className="text-sm text-muted-foreground">
                    {tStart('maxReached')}
                  </p>
                ) : (
                  <StartQuizButton
                    courseSlug={slug}
                    quizId={quiz.id}
                    label={t('retakeCta')}
                  />
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

async function loadResultPayload(quizId: string, attemptId: string) {
  const [answers, questions] = await Promise.all([
    listAnswersByAttempt(attemptId),
    listQuestionsByQuiz(quizId),
  ]);
  const correctChoiceIdsByQuestionId = new Map<string, Set<string>>();
  for (const question of questions) {
    correctChoiceIdsByQuestionId.set(
      question.id,
      new Set(question.choices.filter((c) => c.isCorrect).map((c) => c.id)),
    );
  }
  return { answers, correctChoiceIdsByQuestionId };
}
