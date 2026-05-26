import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { findCourseBySlugOwnedBy } from '@/features/courses/data/courses';
import { LessonList } from '@/features/lessons/components/lesson-list';
import { listLessonsByCourse } from '@/features/lessons/data/lessons';
import { LessonQuizzesOverview } from '@/features/quizzes/components/lesson-quizzes-overview';
import { listLessonQuizzesByCourseOwned } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
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

  const course = await findCourseBySlugOwnedBy(slug, user.id);
  if (!course) notFound();

  const [lessons, quizzesOverview, t] = await Promise.all([
    listLessonsByCourse(course.id),
    listLessonQuizzesByCourseOwned(slug, user.id),
    getTranslations('courses.detail'),
  ]);

  const isPublished = course.publishedAt !== null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {isPublished ? t('statusPublished') : t('statusDraft')}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{course.title}</h1>
        {course.description ? (
          <p className="text-muted-foreground">{course.description}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{t('slugDisplay', { slug: course.slug })}</p>
      </header>

      <section aria-labelledby="lessons-heading" className="mb-8 grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="lessons-heading" className="text-lg font-semibold">
            {t('lessonsHeading')}
          </h2>
          <Button asChild size="sm">
            <Link href={`/instructor/courses/${course.slug}/lessons/new`}>
              {t('addLesson')}
            </Link>
          </Button>
        </div>
        <LessonList lessons={lessons} />
      </section>

      <section aria-labelledby="quizzes-heading" className="grid gap-3">
        <h2 id="quizzes-heading" className="text-lg font-semibold">
          {t('quizzesHeading')}
        </h2>
        <LessonQuizzesOverview items={quizzesOverview} courseSlug={course.slug} />
      </section>
    </main>
  );
}
