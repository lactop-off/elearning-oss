import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import type { LessonQuizzesOverviewItem } from '@/features/quizzes/data/quizzes';
import { Link } from '@/i18n/navigation';

export async function LessonQuizzesOverview({
  items,
  courseSlug,
}: {
  items: LessonQuizzesOverviewItem[];
  courseSlug: string;
}) {
  const t = await getTranslations('quizzes.overview');

  if (items.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
      >
        {t('noLessons')}
      </div>
    );
  }

  return (
    <ol aria-label={t('listAria')} className="grid gap-4">
      {items.map((item) => (
        <li key={item.lessonId} className="grid gap-2 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">
              <span className="mr-2 text-muted-foreground">{item.lessonOrder}.</span>
              {item.lessonTitle}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/instructor/courses/${courseSlug}/lessons/${item.lessonOrder}/quizzes/new`}
              >
                {t('addQuizCta')}
              </Link>
            </Button>
          </div>
          {item.quizzes.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('noQuizzes')}</p>
          ) : (
            <ul aria-label={t('quizzesAria')} className="grid gap-1">
              {item.quizzes.map((quiz) => (
                <li
                  key={quiz.id}
                  className="flex items-center justify-between gap-3 rounded bg-muted/40 px-3 py-2"
                >
                  <div className="grid">
                    <span className="text-sm font-medium">{quiz.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('quizMeta', {
                        passing: quiz.passingScore,
                        questions: quiz.questionCount,
                        required: quiz.isRequired ? t('isRequired') : t('isOptional'),
                      })}
                    </span>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/instructor/courses/${courseSlug}/quizzes/${quiz.id}`}>
                      {t('manageCta')}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
