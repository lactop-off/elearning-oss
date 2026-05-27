import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { GradeForm } from '@/features/attempts/components/grade-form';
import { findAttemptForGrading } from '@/features/attempts/data/grading';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function InstructorGradingAttemptPage({
  params,
}: {
  params: Promise<{ locale: string; attemptId: string }>;
}) {
  const { locale, attemptId } = await params;
  setRequestLocale(locale);

  let user;
  try {
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: e.code === 'UNAUTHORIZED' ? '/sign-in' : '/', locale });
    }
    throw e;
  }

  const [attempt, t] = await Promise.all([
    findAttemptForGrading(attemptId, user.id),
    getTranslations('instructor.grading'),
  ]);

  if (!attempt) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link href="/instructor/grading" className="text-muted-foreground hover:text-foreground">
          {t('backLink')}
        </Link>
      </p>

      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{attempt.quizTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {t('passingScoreLabel', { passing: attempt.passingScore })}
        </p>
        {attempt.autoPossible > 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('autoSummary', {
              autoEarned: attempt.autoEarned,
              autoPossible: attempt.autoPossible,
            })}
          </p>
        ) : null}
      </header>

      <GradeForm attemptId={attempt.attemptId} textItems={attempt.textItems} />
    </main>
  );
}
