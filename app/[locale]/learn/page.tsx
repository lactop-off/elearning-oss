import { ArrowRight, CheckCircle2, GraduationCap, User } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CourseCard } from '@/features/courses/components/course-card';
import { CourseCardSkeletonGrid } from '@/features/courses/components/course-card-skeleton';
import { listEnrollmentsByUser } from '@/features/enrollments/data/enrollments';
import { Link, redirect } from '@/i18n/navigation';
import { AuthError, requireUser } from '@/lib/auth';

export default async function MyLearningPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: '/sign-in', locale });
    }
    throw e;
  }

  const t = await getTranslations('learn');

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <header className="mb-6 grid gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('heading')}</h1>
        <p className="text-muted-foreground">{t('subheading')}</p>
      </header>

      <Suspense fallback={<CourseCardSkeletonGrid count={4} />}>
        <EnrolledCourses userId={user.id} />
      </Suspense>
    </main>
  );
}

async function EnrolledCourses({ userId }: { userId: string }) {
  const [enrollments, t] = await Promise.all([
    listEnrollmentsByUser(userId),
    getTranslations('learn'),
  ]);

  if (enrollments.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center"
      >
        <GraduationCap
          className="size-10 text-muted-foreground/60"
          aria-hidden="true"
        />
        <p className="text-muted-foreground">{t('empty.message')}</p>
        <Button asChild>
          <Link href="/courses">{t('empty.cta')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul aria-label={t('listAria')} className="grid gap-4 sm:grid-cols-2">
      {enrollments.map((enrollment) => {
        const isCompleted = enrollment.completedAt !== null;
        return (
          <li key={enrollment.enrollmentId}>
            <CourseCard
              seed={enrollment.course.slug}
              badges={
                isCompleted ? (
                  <Badge variant="primarySoft">
                    <CheckCircle2 aria-hidden="true" />
                    {t('statusCompleted')}
                  </Badge>
                ) : (
                  <Badge variant="muted">{t('statusInProgress')}</Badge>
                )
              }
              title={
                <Link
                  href={`/courses/${enrollment.course.slug}`}
                  className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  {enrollment.course.title}
                </Link>
              }
              meta={
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5" aria-hidden="true" />
                  {t('byInstructor', {
                    name: enrollment.course.instructor.name,
                  })}
                </span>
              }
              description={enrollment.course.description}
              footer={
                <Link
                  href={`/courses/${enrollment.course.slug}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80 focus-visible:underline focus-visible:outline-none"
                >
                  {isCompleted ? t('reviewCta') : t('continueCta')}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
