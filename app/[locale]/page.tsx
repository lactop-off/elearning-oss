import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
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
  const t = await getTranslations({ locale });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{t('common.appName')}</h1>
        <p className="text-muted-foreground">{t('common.appDescription')}</p>

        {user ? (
          <div className="flex flex-col items-center gap-3">
            <p>
              <span className="font-medium">
                {t('home.signedInAs', { name: user.name ?? '' })}
              </span>{' '}
              <span className="text-muted-foreground">
                {t('home.roleLabel', { role: t(`roles.${user.role}`) })}
              </span>
            </p>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/sign-in">{t('auth.cta.signIn')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">{t('auth.cta.createAccount')}</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
