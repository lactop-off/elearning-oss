import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listCoursesForApproval } from '@/features/admin/data/admin';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: e.code === 'UNAUTHORIZED' ? '/sign-in' : '/', locale });
    }
    throw e;
  }

  const [pendingCourses, t] = await Promise.all([
    listCoursesForApproval(),
    getTranslations('admin.dashboard'),
  ]);

  const pendingCount = pendingCourses.length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-8 grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users" className="group outline-none">
          <Card className="h-full transition-colors group-hover:bg-muted/50 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
            <CardHeader>
              <CardTitle>{t('usersCard')}</CardTitle>
              <CardDescription>{t('usersCardDescription')}</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/admin/courses" className="group outline-none">
          <Card className="h-full transition-colors group-hover:bg-muted/50 group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
            <CardHeader>
              <CardTitle>{t('coursesCard')}</CardTitle>
              <CardDescription>
                {t('coursesCardDescription')}
                {pendingCount > 0 ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">
                    {t('pendingCount', { count: pendingCount })}
                  </span>
                ) : null}
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </main>
  );
}
