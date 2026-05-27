import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { Link } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export async function SiteHeader() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  const canManageCourses = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <nav
        aria-label={t('nav.primary')}
        className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
      >
        <Link href="/" className="text-sm font-semibold tracking-tight hover:text-foreground/80">
          {t('common.appName')}
        </Link>

        <ul className="flex items-center gap-2">
          <li>
            <Button asChild variant="ghost" size="sm">
              <Link href="/courses">{t('nav.catalog')}</Link>
            </Button>
          </li>
          {user ? (
            <>
              <li>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/learn">{t('nav.myLearning')}</Link>
                </Button>
              </li>
              {canManageCourses && (
                <>
                  <li>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/instructor/courses">{t('nav.myCourses')}</Link>
                    </Button>
                  </li>
                  <li>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/instructor/grading">{t('nav.grading')}</Link>
                    </Button>
                  </li>
                </>
              )}
              {user?.role === 'ADMIN' && (
                <li>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/admin">{t('nav.admin')}</Link>
                  </Button>
                </li>
              )}
              <li className="hidden text-sm text-muted-foreground sm:inline">{user.name}</li>
              <li>
                <SignOutButton />
              </li>
            </>
          ) : (
            <>
              <li>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">{t('auth.cta.signIn')}</Link>
                </Button>
              </li>
              <li>
                <Button asChild size="sm">
                  <Link href="/sign-up">{t('auth.cta.createAccount')}</Link>
                </Button>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}
