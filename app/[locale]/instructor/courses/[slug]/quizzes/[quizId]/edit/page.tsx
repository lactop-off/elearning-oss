import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QuizEditForm } from '@/features/quizzes/components/quiz-edit-form';
import { findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function EditQuizPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; quizId: string }>;
}) {
  const { locale, slug, quizId } = await params;
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

  const quiz = await findQuizOwnedByInstructor(quizId, user.id);
  if (!quiz || quiz.course.slug !== slug) notFound();

  const t = await getTranslations('quizzes.edit');

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${slug}/quizzes/${quiz.id}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { quizTitle: quiz.title })}
        </Link>
      </p>
      <Card>
        <CardHeader>
          <CardTitle asChild className="text-2xl font-semibold tracking-tight">
            <h1>{t('title')}</h1>
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <QuizEditForm
            quizId={quiz.id}
            courseSlug={slug}
            defaultValues={{
              title: quiz.title,
              description: quiz.description ?? '',
              passingScore: quiz.passingScore,
              isRequired: quiz.isRequired,
              timeLimitSec: quiz.timeLimitSec,
              maxAttempts: quiz.maxAttempts,
              shuffleChoices: quiz.shuffleChoices,
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}
