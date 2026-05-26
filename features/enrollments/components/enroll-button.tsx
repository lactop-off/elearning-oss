'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { enrollAction } from '@/features/enrollments/actions/enroll';
import { useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'COURSE_NOT_PUBLISHED',
  'ALREADY_ENROLLED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('enrollments.button');
  const tToast = useTranslations('enrollments.toast');
  const tError = useTranslations('enrollments.errors');

  function handleClick() {
    startTransition(async () => {
      const result = await enrollAction({ courseId });
      if (result.ok) {
        toast.success(tToast('enrolled'));
        router.push('/learn');
        router.refresh();
        return;
      }
      if (result.error === 'UNAUTHORIZED') {
        router.push('/sign-in');
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg">
      {isPending ? t('working') : t('enroll')}
    </Button>
  );
}
