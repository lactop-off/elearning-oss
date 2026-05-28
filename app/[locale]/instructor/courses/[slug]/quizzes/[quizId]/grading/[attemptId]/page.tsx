import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { findAttemptForGradingOwnedBy } from '@/features/attempts/data/attempts';
import { GradingForm } from '@/features/attempts/components/grading-form';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function GradeAttemptPage({
  params,
}: {
  params: Promise<{
    locale: string;
    slug: string;
    quizId: string;
    attemptId: string;
  }>;
}) {
  const { locale, slug, quizId, attemptId } = await params;
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

  const attempt = await findAttemptForGradingOwnedBy(attemptId, user.id);
  if (!attempt || attempt.quizId !== quizId || attempt.courseSlug !== slug) {
    notFound();
  }

  const [t, format] = await Promise.all([
    getTranslations('quizzes.grading'),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${slug}/quizzes/${quizId}/grading`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('detailBackLink')}
        </Link>
      </p>

      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('detailHeading', { name: attempt.learnerName })}
        </h1>
        <p className="text-muted-foreground">{t('detailDescription')}</p>
        <p className="text-xs text-muted-foreground">
          {t('submittedAtLabel')}:{' '}
          {attempt.submittedAt ? format.dateTime(attempt.submittedAt, 'short') : ''}
        </p>
      </header>

      <GradingForm
        attemptId={attempt.attemptId}
        courseSlug={slug}
        answers={attempt.textAnswers}
      />
    </main>
  );
}
