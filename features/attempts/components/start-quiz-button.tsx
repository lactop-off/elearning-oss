'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { startAttemptAction } from '@/features/attempts/actions/start-attempt';
import { useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'MAX_ATTEMPTS_REACHED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function StartQuizButton({
  courseSlug,
  quizId,
  label,
}: {
  courseSlug: string;
  quizId: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('attempts.start');
  const tError = useTranslations('attempts.errors');

  function handleClick() {
    startTransition(async () => {
      const result = await startAttemptAction({ courseSlug, quizId });
      if (result.ok) {
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Button onClick={handleClick} disabled={isPending} size="lg">
      {isPending ? t('working') : label}
    </Button>
  );
}
