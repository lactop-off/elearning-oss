'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { markLessonCompleteAction } from '@/features/progress/actions/mark-complete';
import { useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'ALREADY_COMPLETED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function MarkCompleteButton({
  enrollmentId,
  lessonId,
  alreadyComplete,
}: {
  enrollmentId: string;
  lessonId: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('progress.button');
  const tToast = useTranslations('progress.toast');
  const tError = useTranslations('progress.errors');

  if (alreadyComplete) {
    return (
      <Button variant="outline" size="lg" disabled aria-disabled="true">
        {t('alreadyComplete')}
      </Button>
    );
  }

  function handleClick() {
    startTransition(async () => {
      const result = await markLessonCompleteAction({ enrollmentId, lessonId });
      if (result.ok) {
        toast.success(tToast('completed'));
        router.refresh();
        return;
      }
      if (result.error === 'ALREADY_COMPLETED') {
        // Treat as success — likely a race between two tabs.
        toast.success(tToast('completed'));
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg">
      {isPending ? t('working') : t('markComplete')}
    </Button>
  );
}
