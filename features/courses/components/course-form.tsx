'use client';

import { useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

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
import { createCourseAction } from '@/features/courses/actions/create';
import { z } from 'zod';

import { CreateCourseSchema } from '@/features/courses/schemas/course';

type CreateCourseFormValues = z.input<typeof CreateCourseSchema>;
import { useRouter } from '@/i18n/navigation';
import { slugify } from '@/lib/slug';

const KNOWN_ERROR_CODES = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'SLUG_TAKEN',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string): code is KnownErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export function CourseForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('courses.new');
  const tToast = useTranslations('courses.toast');
  const tError = useTranslations('courses.errors');

  const form = useForm<CreateCourseFormValues>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: { title: '', slug: '', description: '' },
  });

  const title = form.watch('title');
  const slugDirty = form.formState.dirtyFields.slug;

  useEffect(() => {
    if (!slugDirty) {
      form.setValue('slug', slugify(title), { shouldValidate: false });
    }
  }, [title, slugDirty, form]);

  function onSubmit(values: CreateCourseFormValues) {
    startTransition(async () => {
      const result = await createCourseAction(values);
      if (result.ok) {
        toast.success(tToast('created'));
        router.push('/');
        router.refresh();
        return;
      }
      const message = isKnownErrorCode(result.error)
        ? tError(result.error)
        : tError('INTERNAL_ERROR');
      toast.error(message);
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
                <Input
                  autoComplete="off"
                  placeholder={t('titlePlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('slugLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="off" placeholder="intro-to-typescript" {...field} />
              </FormControl>
              <FormDescription>{t('slugHelper')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  autoComplete="off"
                  placeholder={t('descriptionPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormDescription>{t('descriptionHelper')}</FormDescription>
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
