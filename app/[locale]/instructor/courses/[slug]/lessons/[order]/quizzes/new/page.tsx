import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuizForm } from '@/features/quizzes/components/quiz-form';
import { findLessonOwnedByInstructorForQuiz } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

function parseOrder(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const value = Number.parseInt(raw, 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export default async function NewQuizPage({
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
    user = await requireRole('INSTRUCTOR', 'ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: e.code === 'UNAUTHORIZED' ? '/sign-in' : '/', locale });
    }
    throw e;
  }

  const lesson = await findLessonOwnedByInstructorForQuiz(slug, order, user.id);
  if (!lesson) notFound();

  const t = await getTranslations('quizzes.new');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { lessonTitle: lesson.lessonTitle })}
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
          <QuizForm
            lessonId={lesson.lessonId}
            courseSlug={slug}
            lessonOrder={order}
          />
        </CardContent>
      </Card>
    </main>
  );
}
