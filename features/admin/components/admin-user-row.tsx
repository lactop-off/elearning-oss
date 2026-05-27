'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { setUserDisabledAction } from '@/features/admin/actions/set-user-disabled';
import { updateUserRoleAction } from '@/features/admin/actions/update-user-role';
import type { AdminUserRow as AdminUserRowData } from '@/features/admin/data/admin';
import type { UserRole } from '@/lib/generated/prisma/enums';

const KNOWN_ERROR_CODES = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'SELF_FORBIDDEN',
  'INTERNAL_ERROR',
] as const;

type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownError(code: string): code is KnownErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

const ROLES: UserRole[] = ['LEARNER', 'INSTRUCTOR', 'ADMIN'];

export function AdminUserRow({
  user,
  currentUserId,
}: {
  user: AdminUserRowData;
  currentUserId: string;
}) {
  const [isPendingRole, startRoleTransition] = useTransition();
  const [isPendingDisable, startDisableTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('roles');
  const tErrors = useTranslations('admin.errors');

  const isSelf = user.id === currentUserId;
  const isDisabled = user.disabledAt !== null;
  const isPending = isPendingRole || isPendingDisable;

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.currentTarget.value as UserRole;
    startRoleTransition(async () => {
      const result = await updateUserRoleAction({ userId: user.id, role: newRole });
      if (result.ok) {
        toast.success(t('roleUpdated'));
        router.refresh();
        return;
      }
      const code = isKnownError(result.error) ? result.error : 'INTERNAL_ERROR';
      toast.error(tErrors(code));
    });
  }

  function handleToggleDisabled() {
    startDisableTransition(async () => {
      const result = await setUserDisabledAction({ userId: user.id, disabled: !isDisabled });
      if (result.ok) {
        toast.success(isDisabled ? t('enabledToast') : t('disabledToast'));
        router.refresh();
        return;
      }
      const code = isKnownError(result.error) ? result.error : 'INTERNAL_ERROR';
      toast.error(tErrors(code));
    });
  }

  const joinedDate = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(user.createdAt));

  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 text-sm">{user.email}</td>
      <td className="px-4 py-3 text-sm">{user.name ?? '—'}</td>
      <td className="px-4 py-3 text-sm">
        <label className="sr-only" htmlFor={`role-${user.id}`}>
          {t('roleSelectAria', { name: user.name ?? user.email })}
        </label>
        <select
          id={`role-${user.id}`}
          defaultValue={user.role}
          disabled={isSelf || isPending}
          onChange={handleRoleChange}
          className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {tRoles(role)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-sm">
        {isDisabled ? (
          <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
            {t('statusDisabled')}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {t('statusActive')}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums">{user.authoredCount}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{joinedDate}</td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          disabled={isSelf || isPending}
          onClick={handleToggleDisabled}
        >
          {isDisabled ? t('enableCta') : t('disableCta')}
        </Button>
      </td>
    </tr>
  );
}
