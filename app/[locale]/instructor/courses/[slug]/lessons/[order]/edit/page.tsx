import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LessonEditForm } from '@/features/lessons/components/lesson-edit-form';
import { findLessonOwnedByInstructorBySlugAndOrder } from '@/features/lessons/data/lessons';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; order: string }>;
}) {
  const { locale, slug, order } = await params;
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

  const orderNum = Number.parseInt(order, 10);
  if (!Number.isFinite(orderNum) || orderNum < 1) notFound();

  const lesson = await findLessonOwnedByInstructorBySlugAndOrder(slug, orderNum, user.id);
  if (!lesson) notFound();

  const t = await getTranslations('lessons.edit');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${lesson.course.slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink')}
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle asChild>
            <h1>{t('title', { order: lesson.order })}</h1>
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LessonEditForm
            lessonId={lesson.id}
            courseSlug={lesson.course.slug}
            defaultValues={{
              title: lesson.title,
              content: lesson.content,
              isRequired: lesson.isRequired,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
