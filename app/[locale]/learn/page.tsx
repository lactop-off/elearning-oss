import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listEnrollmentsByUser } from '@/features/enrollments/data/enrollments';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireUser } from '@/lib/auth';

export default async function MyLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  const [enrollments, t] = await Promise.all([
    listEnrollmentsByUser(user.id),
    getTranslations('learn'),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="text-muted-foreground">{t('subheading')}</p>
      </header>

      {enrollments.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center"
        >
          <p className="text-muted-foreground">{t('empty.message')}</p>
          <Button asChild>
            <Link href="/courses">{t('empty.cta')}</Link>
          </Button>
        </div>
      ) : (
        <ul aria-label={t('listAria')} className="grid gap-4">
          {enrollments.map((enrollment) => (
            <li key={enrollment.enrollmentId}>
              <Card>
                <CardHeader>
                  <CardTitle asChild>
                    <h2>
                      <Link
                        href={`/courses/${enrollment.course.slug}`}
                        className="hover:underline"
                      >
                        {enrollment.course.title}
                      </Link>
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    {t('byInstructor', { name: enrollment.course.instructor.name })}
                  </CardDescription>
                </CardHeader>
                {enrollment.course.description ? (
                  <CardContent className="text-sm text-muted-foreground">
                    {enrollment.course.description}
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
