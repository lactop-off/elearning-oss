import { GraduationCap, LogIn, UserPlus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { MainNav } from '@/components/main-nav';
import { RoleBadge } from '@/components/role-badge';
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
        className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4"
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight transition-colors hover:text-foreground/80"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="size-4" aria-hidden="true" />
            </span>
            <span className="hidden sm:inline">{t('common.appName')}</span>
          </Link>

          <MainNav
            isAuthenticated={Boolean(user)}
            canManageCourses={canManageCourses}
          />
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span
              className="hidden items-center gap-2 sm:flex"
              aria-label={t('nav.signedInAria', { name: user.name ?? '' })}
            >
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <RoleBadge role={user.role} />
            </span>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">
                <LogIn aria-hidden="true" />
                {t('auth.cta.signIn')}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up">
                <UserPlus aria-hidden="true" />
                {t('auth.cta.createAccount')}
              </Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
}
