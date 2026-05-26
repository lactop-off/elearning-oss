import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
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

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t('common.appName')}</h1>
        <p className="text-muted-foreground">{t('common.appDescription')}</p>

        {user ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm">
              {t('home.signedInAs', { name: user.name ?? '' })}{' '}
              <span className="text-muted-foreground">
                {t('home.roleLabel', { role: t(`roles.${user.role}`) })}
              </span>
            </p>
            {canManageCourses && (
              <Button asChild>
                <Link href="/instructor/courses">{t('nav.myCourses')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <Button asChild size="lg">
            <Link href="/sign-up">{t('auth.cta.createAccount')}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
