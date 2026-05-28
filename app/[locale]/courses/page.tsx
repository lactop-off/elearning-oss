import { ArrowRight, BookOpen, User } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { CourseCard } from '@/features/courses/components/course-card';
import { CourseCardSkeletonGrid } from '@/features/courses/components/course-card-skeleton';
import { listPublishedCourses } from '@/features/courses/data/courses';
import { Link } from '@/i18n/navigation';

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('catalog');

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="text-muted-foreground">{t('subheading')}</p>
      </header>

      <Suspense fallback={<CourseCardSkeletonGrid count={4} />}>
        <CatalogList />
      </Suspense>
    </main>
  );
}

async function CatalogList() {
  const [courses, t] = await Promise.all([
    listPublishedCourses(),
    getTranslations('catalog'),
  ]);

  if (courses.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center"
      >
        <BookOpen
          className="size-10 text-muted-foreground/60"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <ul aria-label={t('listAria')} className="grid gap-4 sm:grid-cols-2">
      {courses.map((course) => (
        <li key={course.id}>
          <CourseCard
            seed={course.slug}
            title={
              <Link
                href={`/courses/${course.slug}`}
                className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
              >
                {course.title}
              </Link>
            }
            meta={
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" aria-hidden="true" />
                {t('byInstructor', { name: course.instructor.name })}
              </span>
            }
            description={course.description}
            footer={
              <Link
                href={`/courses/${course.slug}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:underline focus-visible:outline-none"
              >
                {t('viewCourse')}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />
        </li>
      ))}
    </ul>
  );
}
