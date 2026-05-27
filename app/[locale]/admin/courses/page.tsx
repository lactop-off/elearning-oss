import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ApproveCourseButton } from '@/features/admin/components/approve-course-button';
import { listCoursesForApproval } from '@/features/admin/data/admin';
import { redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: e.code === 'UNAUTHORIZED' ? '/sign-in' : '/', locale });
    }
    throw e;
  }

  const [courses, t] = await Promise.all([
    listCoursesForApproval(),
    getTranslations('admin.courses'),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-1">
        <h1 id="courses-heading" className="text-2xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </header>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm" aria-labelledby="courses-heading">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th scope="col" className="px-4 py-3 font-medium">
                  {t('colTitle')}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t('colInstructor')}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t('colPublished')}
                </th>
                <th scope="col" className="px-4 py-3 font-medium sr-only">
                  {t('colActions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{course.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {course.instructorName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    }).format(new Date(course.publishedAt))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ApproveCourseButton courseId={course.id} courseTitle={course.title} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
