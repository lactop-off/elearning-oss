'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createLessonAction } from '@/features/lessons/actions/create';
import { CreateLessonSchema } from '@/features/lessons/schemas/lesson';
import { useRouter } from '@/i18n/navigation';

type LessonFormValues = z.input<typeof CreateLessonSchema>;

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'COURSE_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function LessonForm({
  courseId,
  courseSlug,
}: {
  courseId: string;
  courseSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('lessons.new');
  const tToast = useTranslations('lessons.toast');
  const tError = useTranslations('lessons.errors');

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(CreateLessonSchema),
    defaultValues: { courseId, title: '', content: '', isRequired: true },
  });

  function onSubmit(values: LessonFormValues) {
    startTransition(async () => {
      const result = await createLessonAction(values);
      if (result.ok) {
        toast.success(tToast('created'));
        router.push(`/instructor/courses/${courseSlug}`);
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('titleLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="off" placeholder={t('titlePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('contentLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={10}
                  autoComplete="off"
                  placeholder={t('contentPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('contentHelper')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isRequired"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  id="lesson-isRequired"
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="size-4 rounded border-input"
                />
              </FormControl>
              <FormLabel htmlFor="lesson-isRequired" className="!mt-0">
                {t('requiredLabel')}
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
