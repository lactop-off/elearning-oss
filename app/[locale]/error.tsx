'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorPage');

  useEffect(() => {
    // 開発・本番ともに監視できるようコンソールへ記録 (詳細はユーザーに出さない)
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span
          className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          aria-hidden="true"
        >
          <AlertTriangle className="size-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>{t('retry')}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t('home')}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
