import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { CourseListItem as CourseItem } from '@/features/courses/data/courses';
import { PublishToggle } from '@/features/courses/components/publish-toggle';

export async function CourseListItem({ course }: { course: CourseItem }) {
  const t = await getTranslations('courses.list');
  const isPublished = course.publishedAt !== null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <CardTitle asChild>
              <h2>{course.title}</h2>
            </CardTitle>
            <CardDescription>
              {isPublished ? t('statusPublished') : t('statusDraft')}
              {' · '}
              {t('slugDisplay', { slug: course.slug })}
            </CardDescription>
          </div>
          <PublishToggle courseId={course.id} isPublished={isPublished} />
        </div>
      </CardHeader>
      {course.description ? (
        <CardContent className="text-sm text-muted-foreground">{course.description}</CardContent>
      ) : null}
    </Card>
  );
}
