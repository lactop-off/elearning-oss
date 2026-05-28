import { GraduationCap } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

export async function SiteFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              {t('common.appName')}
            </p>
            <p className="text-xs text-muted-foreground">{t('footer.tagline')}</p>
          </div>
        </div>

        <nav
          aria-label={t('footer.aria')}
          className="flex items-center gap-4 text-sm text-muted-foreground"
        >
          <Link
            href="/courses"
            className="transition-colors hover:text-foreground"
          >
            {t('nav.catalog')}
          </Link>
        </nav>

        <p className="text-xs text-muted-foreground">
          {t('footer.copyright', { year })}
        </p>
      </div>
    </footer>
  );
}
