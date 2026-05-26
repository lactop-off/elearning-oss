import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LessonListItem } from '@/features/lessons/data/lessons';

export async function LessonList({ lessons }: { lessons: LessonListItem[] }) {
  const t = await getTranslations('lessons.list');

  if (lessons.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
      >
        {t('empty')}
      </div>
    );
  }

  return (
    <ol aria-label={t('listAria')} className="grid gap-3">
      {lessons.map((lesson) => (
        <li key={lesson.id}>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <CardTitle asChild>
                    <h3>
                      <span className="mr-2 text-muted-foreground">{lesson.order}.</span>
                      {lesson.title}
                    </h3>
                  </CardTitle>
                  <CardDescription>
                    {lesson.isRequired ? t('required') : t('optional')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {t('contentTypeLabel', { type: lesson.contentType })}
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
