import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuestionForm } from '@/features/quizzes/components/question-form';
import { SortableQuestionList } from '@/features/quizzes/components/sortable-question-list';
import { QuizDeleteButton } from '@/features/quizzes/components/quiz-delete-button';
import { listQuestionsByQuiz } from '@/features/quizzes/data/questions';
import { findQuizOwnedByInstructor } from '@/features/quizzes/data/quizzes';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function InstructorQuizPage({
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

  const [questions, t, tList] = await Promise.all([
    listQuestionsByQuiz(quiz.id),
    getTranslations('quizzes.manage'),
    getTranslations('quizzes.list'),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="mb-3 text-sm">
        <Link
          href={`/instructor/courses/${slug}`}
          className="text-muted-foreground hover:text-foreground"
        >
          {t('backLink', { courseTitle: quiz.course.title })}
        </Link>
      </p>

      <header className="mb-6 grid gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {quiz.lesson
            ? t('attachedToLesson', { order: quiz.lesson.order, title: quiz.lesson.title })
            : t('attachedToCourse')}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/instructor/courses/${slug}/quizzes/${quiz.id}/edit`}>
                {tList('edit')}
              </Link>
            </Button>
            <QuizDeleteButton
              quizId={quiz.id}
              quizTitle={quiz.title}
              courseSlug={slug}
            />
          </div>
        </div>
        {quiz.description ? (
          <p className="text-muted-foreground">{quiz.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {t('meta', {
            passing: quiz.passingScore,
            required: quiz.isRequired ? t('isRequired') : t('isOptional'),
          })}
        </p>
      </header>

      <section aria-labelledby="questions-heading" className="mb-8 grid gap-3">
        <h2 id="questions-heading" className="text-lg font-semibold">
          {t('questionsHeading', { count: questions.length })}
        </h2>
        <SortableQuestionList quizId={quiz.id} questions={questions} />
      </section>

      <section aria-labelledby="add-question-heading" className="grid gap-3">
        <h2 id="add-question-heading" className="text-lg font-semibold">
          {t('addQuestionHeading')}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle asChild>
              <h3>{t('addQuestionTitle')}</h3>
            </CardTitle>
            <CardDescription>{t('addQuestionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionForm quizId={quiz.id} />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
