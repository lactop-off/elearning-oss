'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { approveCourseAction } from '@/features/admin/actions/approve-course';

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

export function ApproveCourseButton({ courseId }: { courseId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const t = useTranslations('admin.courses');
  const tErrors = useTranslations('admin.errors');

  function handleClick() {
    startTransition(async () => {
      const result = await approveCourseAction({ courseId });
      if (result.ok) {
        toast.success(t('approvedToast'));
        router.refresh();
        return;
      }
      const code = isKnownError(result.error) ? result.error : 'INTERNAL_ERROR';
      toast.error(tErrors(code));
    });
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={isPending}>
      {t('approveCta')}
    </Button>
  );
}
