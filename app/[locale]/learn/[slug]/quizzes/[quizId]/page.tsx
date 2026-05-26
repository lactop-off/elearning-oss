import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
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
  const t = await getTranslations('attempts.page');

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
          <CardTitle asChild>
            <h1>{quiz.title}</h1>
          </CardTitle>
          <CardDescription>
            {t('meta', {
              questions: quiz.questions.length,
              passing: quiz.passingScore,
              required: quiz.isRequired ? t('isRequired') : t('isOptional'),
            })}
          </CardDescription>
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
          ) : latestAttempt.status === 'IN_PROGRESS' ? (
            <QuizTaker
              courseSlug={slug}
              attemptId={latestAttempt.id}
              questions={quiz.questions}
            />
          ) : resultPayload ? (
            <div className="grid gap-6">
              <QuizResult
                score={latestAttempt.score ?? 0}
                passed={latestAttempt.passed ?? false}
                passingScore={quiz.passingScore}
                questions={quiz.questions}
                answers={resultPayload.answers}
                correctChoiceByQuestionId={resultPayload.correctChoiceByQuestionId}
              />
              <div>
                <StartQuizButton
                  courseSlug={slug}
                  quizId={quiz.id}
                  label={t('retakeCta')}
                />
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
  const correctChoiceByQuestionId = new Map<string, string | null>();
  for (const question of questions) {
    const correct = question.choices.find((c) => c.isCorrect);
    correctChoiceByQuestionId.set(question.id, correct?.id ?? null);
  }
  return { answers, correctChoiceByQuestionId };
}
