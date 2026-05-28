import { User } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { CourseCard } from '@/features/courses/components/course-card';
import { PublishToggle } from '@/features/courses/components/publish-toggle';
import type { CourseListItem as CourseItem } from '@/features/courses/data/courses';
import { Link } from '@/i18n/navigation';

export async function CourseListItem({ course }: { course: CourseItem }) {
  const t = await getTranslations('courses.list');
  const isPublished = course.publishedAt !== null;

  return (
    <CourseCard
      seed={course.slug}
      badges={
        isPublished ? (
          <Badge variant="primarySoft">{t('statusPublished')}</Badge>
        ) : (
          <Badge variant="muted">{t('statusDraft')}</Badge>
        )
      }
      title={
        <Link
          href={`/instructor/courses/${course.slug}`}
          className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
        >
          {course.title}
        </Link>
      }
      meta={
        <span className="flex items-center gap-1.5">
          <User className="size-3.5" aria-hidden="true" />
          {t('slugDisplay', { slug: course.slug })}
        </span>
      }
      action={<PublishToggle courseId={course.id} isPublished={isPublished} />}
      description={course.description}
    />
  );
}
