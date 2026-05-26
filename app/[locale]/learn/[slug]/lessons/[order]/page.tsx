import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { findEnrolledCourseBySlug } from '@/features/enrollments/data/enrollments';
import {
  findLessonByCourseAndOrder,
  listLessonsByCourse,
} from '@/features/lessons/data/lessons';
import { listProgressByEnrollment } from '@/features/progress/data/progress';
import { MarkCompleteButton } from '@/features/progress/components/mark-complete-button';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireUser } from '@/lib/auth';

function parseOrder(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export default async function LessonReadPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; order: string }>;
}) {
  const { locale, slug, order: orderParam } = await params;
  setRequestLocale(locale);

  const order = parseOrder(orderParam);
  if (order === null) notFound();

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

  const [lesson, lessons, progressRows, t] = await Promise.all([
    findLessonByCourseAndOrder(enrollment.course.id, order),
    listLessonsByCourse(enrollment.course.id),
    listProgressByEnrollment(enrollment.enrollmentId),
    getTranslations('learn.lesson'),
  ]);

  if (!lesson) notFound();

  const completedSet = new Set(progressRows.map((p) => p.lessonId));
  const alreadyComplete = completedSet.has(lesson.id);
  const prevLesson = lessons.find((l) => l.order === order - 1);
  const nextLesson = lessons.find((l) => l.order === order + 1);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/learn/${enrollment.course.slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { courseTitle: enrollment.course.title })}
        </Link>
      </p>

      <article className="grid gap-6">
        <header className="grid gap-2">
          <p className="text-xs text-muted-foreground">
            {t('lessonNumber', { order: lesson.order })}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{lesson.title}</h1>
          <p className="text-xs text-muted-foreground">
            {lesson.isRequired ? t('required') : t('optional')}
          </p>
        </header>

        <div className="whitespace-pre-wrap text-base leading-relaxed">{lesson.content}</div>

        <div className="flex flex-wrap items-center gap-3">
          <MarkCompleteButton
            enrollmentId={enrollment.enrollmentId}
            lessonId={lesson.id}
            alreadyComplete={alreadyComplete}
          />
          {prevLesson ? (
            <Button asChild variant="outline">
              <Link href={`/learn/${enrollment.course.slug}/lessons/${prevLesson.order}`}>
                {t('previousLesson')}
              </Link>
            </Button>
          ) : null}
          {nextLesson ? (
            <Button asChild variant="outline">
              <Link href={`/learn/${enrollment.course.slug}/lessons/${nextLesson.order}`}>
                {t('nextLesson')}
              </Link>
            </Button>
          ) : null}
        </div>
      </article>
    </main>
  );
}
