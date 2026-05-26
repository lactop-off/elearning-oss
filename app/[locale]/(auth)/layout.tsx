import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center text-2xl font-semibold tracking-tight"
        >
          {t('appName')}
        </Link>
        {children}
      </div>
    </main>
  );
}
