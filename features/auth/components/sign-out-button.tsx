'use client';

import { LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { signOutAction } from '@/features/auth/actions/signout';
import { useRouter } from '@/i18n/navigation';

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.signOut');
  const tToast = useTranslations('auth.toast');

  function handleClick() {
    startTransition(async () => {
      await signOutAction();
      toast.success(tToast('signedOut'));
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
      <LogOut aria-hidden="true" />
      {isPending ? t('submitting') : t('submit')}
    </Button>
  );
}
