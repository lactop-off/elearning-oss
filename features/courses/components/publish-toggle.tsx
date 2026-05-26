'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { setCoursePublishedAction } from '@/features/courses/actions/publish';

const KNOWN = ['INVALID_INPUT', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'INTERNAL_ERROR'] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function PublishToggle({
  courseId,
  isPublished,
}: {
  courseId: string;
  isPublished: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('courses.list.publish');
  const tToast = useTranslations('courses.toast');
  const tError = useTranslations('courses.errors');

  function handleClick() {
    const nextPublish = !isPublished;
    startTransition(async () => {
      const result = await setCoursePublishedAction({ courseId, publish: nextPublish });
      if (result.ok) {
        toast.success(nextPublish ? tToast('published') : tToast('unpublished'));
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Button
      variant={isPublished ? 'outline' : 'default'}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isPublished}
    >
      {isPending
        ? t('working')
        : isPublished
          ? t('unpublishLabel')
          : t('publishLabel')}
    </Button>
  );
}
