import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { findPublishedCourseBySlug } from '@/features/courses/data/courses';
import { findEnrollment } from '@/features/enrollments/data/enrollments';
import { EnrollButton } from '@/features/enrollments/components/enroll-button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function PublicCoursePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const course = await findPublishedCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const existingEnrollment = user ? await findEnrollment(user.id, course.id) : null;
  const t = await getTranslations('catalog.detail');

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link href="/courses" className="text-muted-foreground hover:text-foreground">
          {t('backLink')}
        </Link>
      </p>

      <article className="grid gap-6">
        <header className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {t('byInstructor', { name: course.instructor.name })}
          </p>
        </header>

        {course.description ? (
          <p className="text-muted-foreground">{course.description}</p>
        ) : null}

        <div>
          {!user ? (
            <Button asChild size="lg">
              <Link href="/sign-in">{t('signInToEnroll')}</Link>
            </Button>
          ) : existingEnrollment ? (
            <Button asChild size="lg" variant="outline">
              <Link href="/learn">{t('alreadyEnrolled')}</Link>
            </Button>
          ) : (
            <EnrollButton courseId={course.id} />
          )}
        </div>
      </article>
    </main>
  );
}
