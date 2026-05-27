import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdminUserRow } from '@/features/admin/components/admin-user-row';
import { listUsersForAdmin } from '@/features/admin/data/admin';
import { redirect } from '@/i18n/navigation';
import { AuthError, getCurrentUser, requireRole } from '@/lib/auth';

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  try {
    await requireRole('ADMIN');
  } catch (e) {
    if (e instanceof AuthError) {
      redirect({ href: e.code === 'UNAUTHORIZED' ? '/sign-in' : '/', locale });
    }
    throw e;
  }

  const [currentUser, users, t] = await Promise.all([
    getCurrentUser(),
    listUsersForAdmin(),
    getTranslations('admin.users'),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      </header>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">{t('colEmail')}</th>
              <th className="px-4 py-3 font-medium">{t('colName')}</th>
              <th className="px-4 py-3 font-medium">{t('colRole')}</th>
              <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
              <th className="px-4 py-3 font-medium text-right">{t('colCourses')}</th>
              <th className="px-4 py-3 font-medium">{t('colJoined')}</th>
              <th className="px-4 py-3 font-medium sr-only">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <AdminUserRow key={user.id} user={user} currentUserId={currentUser?.id ?? ''} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
