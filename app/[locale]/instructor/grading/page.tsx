import { getTranslations, setRequestLocale } from 'next-intl/server';

import { listPendingReviewForInstructor } from '@/features/attempts/data/grading';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function InstructorGradingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  const [items, t] = await Promise.all([
    listPendingReviewForInstructor(user.id),
    getTranslations('instructor.grading'),
  ]);

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>

      {items.length === 0 ? (
        <div
          role="status"
          className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground"
        >
          {t('empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('learnerLabel')}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('quizLabel')}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('submittedAtLabel')}
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">{t('reviewCta')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.attemptId} className="hover:bg-muted/30">
                  <td className="px-4 py-3">{item.learnerName}</td>
                  <td className="px-4 py-3">{item.quizTitle}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {dateFormatter.format(item.submittedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/instructor/grading/${item.attemptId}`}
                      className="rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {t('reviewCta')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
