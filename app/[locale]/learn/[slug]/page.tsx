import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { findEnrolledCourseBySlug } from '@/features/enrollments/data/enrollments';
import { listLessonsByCourse } from '@/features/lessons/data/lessons';
import { listProgressByEnrollment } from '@/features/progress/data/progress';
import { ProgressSummary } from '@/features/progress/components/progress-summary';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireUser } from '@/lib/auth';

export default async function EnrolledCoursePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
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

  const enrollment = await findEnrolledCourseBySlug(user.id, slug);
  if (!enrollment) notFound();

  const [lessons, progressRows, t] = await Promise.all([
    listLessonsByCourse(enrollment.course.id),
    listProgressByEnrollment(enrollment.enrollmentId),
    getTranslations('learn.detail'),
  ]);

  const completedSet = new Set(progressRows.map((p) => p.lessonId));
  const totals = lessons.reduce(
    (acc, lesson) => {
      acc.total += 1;
      if (lesson.isRequired) acc.required += 1;
      if (completedSet.has(lesson.id)) {
        acc.completed += 1;
        if (lesson.isRequired) acc.requiredCompleted += 1;
      }
      return acc;
    },
    { total: 0, completed: 0, required: 0, requiredCompleted: 0 },
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link href="/learn" className="text-muted-foreground hover:text-foreground">
          {t('backLink')}
        </Link>
      </p>

      <header className="mb-6 grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{enrollment.course.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t('byInstructor', { name: enrollment.course.instructor.name })}
        </p>
        {enrollment.course.description ? (
          <p className="text-muted-foreground">{enrollment.course.description}</p>
        ) : null}
      </header>

      <section aria-labelledby="progress-heading" className="mb-8 grid gap-3">
        <h2 id="progress-heading" className="text-lg font-semibold">
          {t('progressHeading')}
        </h2>
        <ProgressSummary
          completed={totals.completed}
          total={totals.total}
          requiredCompleted={totals.requiredCompleted}
          requiredTotal={totals.required}
        />
      </section>

      <section aria-labelledby="lessons-heading" className="grid gap-3">
        <h2 id="lessons-heading" className="text-lg font-semibold">
          {t('lessonsHeading')}
        </h2>
        {lessons.length === 0 ? (
          <div
            role="status"
            className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
          >
            {t('noLessons')}
          </div>
        ) : (
          <ol aria-label={t('listAria')} className="grid gap-3">
            {lessons.map((lesson) => {
              const isComplete = completedSet.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <CardTitle asChild>
                            <h3>
                              <Link
                                href={`/learn/${enrollment.course.slug}/lessons/${lesson.order}`}
                                className="hover:underline"
                              >
                                <span className="mr-2 text-muted-foreground">
                                  {lesson.order}.
                                </span>
                                {lesson.title}
                              </Link>
                            </h3>
                          </CardTitle>
                          <CardDescription>
                            {lesson.isRequired ? t('required') : t('optional')}
                          </CardDescription>
                        </div>
                        {isComplete ? (
                          <span
                            className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            aria-label={t('lessonCompleteAria')}
                          >
                            {t('lessonComplete')}
                          </span>
                        ) : null}
                      </div>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">
                      {t('contentTypeLabel', { type: lesson.contentType })}
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
