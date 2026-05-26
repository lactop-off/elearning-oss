import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { findCourseBySlugOwnedBy } from '@/features/courses/data/courses';
import { LessonForm } from '@/features/lessons/components/lesson-form';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function NewLessonPage({
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

  const t = await getTranslations('lessons.new');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${course.slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { courseTitle: course.title })}
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>{t('title')}</h1>
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonForm courseId={course.id} courseSlug={course.slug} />
        </CardContent>
      </Card>
    </main>
  );
}
