import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { CourseCardSkeletonGrid } from '@/features/courses/components/course-card-skeleton';
import { CourseListEmpty } from '@/features/courses/components/course-list-empty';
import { CourseListItem } from '@/features/courses/components/course-list-item';
import { listCoursesByInstructor } from '@/features/courses/data/courses';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireRole } from '@/lib/auth';

export default async function InstructorCoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  const t = await getTranslations('courses.list');

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <Button asChild>
          <Link href="/instructor/courses/new">{t('newCta')}</Link>
        </Button>
      </div>

      <Suspense fallback={<CourseCardSkeletonGrid count={3} columns={false} />}>
        <InstructorCourseList instructorId={user.id} />
      </Suspense>
    </main>
  );
}

async function InstructorCourseList({ instructorId }: { instructorId: string }) {
  const [courses, t] = await Promise.all([
    listCoursesByInstructor(instructorId),
    getTranslations('courses.list'),
  ]);

  if (courses.length === 0) {
    return <CourseListEmpty />;
  }

  return (
    <ul aria-label={t('listAria')} className="grid gap-4">
      {courses.map((course) => (
        <li key={course.id}>
          <CourseListItem course={course} />
        </li>
      ))}
    </ul>
  );
}
