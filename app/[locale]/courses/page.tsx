import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listPublishedCourses } from '@/features/courses/data/courses';
import { Link } from '@/i18n/navigation';

export default async function CatalogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [courses, t] = await Promise.all([
    listPublishedCourses(),
    getTranslations('catalog'),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="text-muted-foreground">{t('subheading')}</p>
      </header>

      {courses.length === 0 ? (
        <div
          role="status"
          className="rounded-lg border border-dashed py-12 text-center text-muted-foreground"
        >
          {t('empty')}
        </div>
      ) : (
        <ul aria-label={t('listAria')} className="grid gap-4 sm:grid-cols-2">
          {courses.map((course) => (
            <li key={course.id}>
              <Card>
                <CardHeader>
                  <CardTitle asChild>
                    <h2>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="hover:underline"
                      >
                        {course.title}
                      </Link>
                    </h2>
                  </CardTitle>
                  <CardDescription>
                    {t('byInstructor', { name: course.instructor.name })}
                  </CardDescription>
                </CardHeader>
                {course.description ? (
                  <CardContent className="text-sm text-muted-foreground">
                    {course.description}
                  </CardContent>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
