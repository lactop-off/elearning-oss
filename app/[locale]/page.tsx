import { ArrowRight, Award, BookOpen, ListChecks, Sparkles } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const t = await getTranslations();
  const canManageCourses = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  const features = [
    {
      Icon: BookOpen,
      title: t('home.features.courses.title'),
      description: t('home.features.courses.description'),
    },
    {
      Icon: ListChecks,
      title: t('home.features.quizzes.title'),
      description: t('home.features.quizzes.description'),
    },
    {
      Icon: Award,
      title: t('home.features.certificate.title'),
      description: t('home.features.certificate.description'),
    },
  ];

  return (
    <main className="flex-1">
      <section className="border-b bg-gradient-to-b from-accent/40 to-background">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-24">
          <Badge variant="primarySoft">
            <Sparkles aria-hidden="true" />
            {t('home.eyebrow')}
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t('common.appName')}
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {t('common.appDescription')}
          </p>

          {user ? (
            <p className="text-sm text-muted-foreground">
              {t('home.signedInAs', { name: user.name ?? '' })}{' '}
              <span>{t('home.roleLabel', { role: t(`roles.${user.role}`) })}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <>
                <Button asChild size="lg">
                  <Link href={canManageCourses ? '/instructor/courses' : '/learn'}>
                    {canManageCourses
                      ? t('home.manageCourses')
                      : t('home.continueLearning')}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/courses">{t('home.browseCatalog')}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    {t('auth.cta.createAccount')}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/courses">{t('home.browseCatalog')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          {t('home.features.heading')}
        </h2>
        <ul className="grid gap-6 sm:grid-cols-3">
          {features.map(({ Icon, title, description }) => (
            <li key={title}>
              <Card className="h-full">
                <CardHeader>
                  <span
                    className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    aria-hidden="true"
                  >
                    <Icon className="size-5" />
                  </span>
                  <CardTitle className="text-base font-semibold tracking-tight">
                    {title}
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
