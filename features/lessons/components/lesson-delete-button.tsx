'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { deleteLessonAction } from '@/features/lessons/actions/delete';
import { useRouter } from '@/i18n/navigation';

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'LESSON_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function LessonDeleteButton({
  lessonId,
  lessonTitle,
  courseSlug,
  triggerLabel,
}: {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('lessons.delete');
  const tToast = useTranslations('lessons.toast');
  const tError = useTranslations('lessons.errors');

  function onConfirm() {
    startTransition(async () => {
      const result = await deleteLessonAction({ lessonId });
      if (result.ok) {
        toast.success(tToast('deleted'));
        setOpen(false);
        router.push(`/instructor/courses/${courseSlug}`);
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel ?? t('trigger')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description', { title: lessonTitle })}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? t('confirming') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
