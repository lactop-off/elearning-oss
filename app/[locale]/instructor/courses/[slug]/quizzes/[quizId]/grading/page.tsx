import { ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { listPendingAttemptsForQuizOwnedBy } from '@/features/attempts/data/attempts';
import { findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function GradingQueuePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; quizId: string }>;
}) {
  const { locale, slug, quizId } = await params;
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

  const quiz = await findQuizOwnedByInstructor(quizId, user.id);
  if (!quiz) notFound();

  const [pending, t, format] = await Promise.all([
    listPendingAttemptsForQuizOwnedBy(quizId, user.id),
    getTranslations('quizzes.grading'),
    getFormatter(),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${slug}/quizzes/${quizId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('listBackLink')}
        </Link>
      </p>

      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('listHeading')}</h1>
        <p className="text-muted-foreground">{t('listDescription')}</p>
      </header>

      {pending.length === 0 ? (
        <div
          role="status"
          className="rounded-lg border border-dashed py-12 text-center text-muted-foreground"
        >
          {t('listEmpty')}
        </div>
      ) : (
        <ul aria-label={t('queueAria')} className="grid gap-3">
          {pending.map((row) => (
            <li key={row.attemptId}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="grid gap-0.5">
                    <p className="font-medium leading-snug">{row.learnerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.submittedAt ? format.dateTime(row.submittedAt, 'short') : ''}
                      {' · '}
                      {t('pendingCountLabel', { count: row.textAnswerCount })}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link
                      href={`/instructor/courses/${slug}/quizzes/${quizId}/grading/${row.attemptId}`}
                    >
                      {t('gradeCta')}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
