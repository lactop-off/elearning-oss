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
import { createQuizAction } from '@/features/quizzes/actions/create-quiz';
import { CreateQuizSchema } from '@/features/quizzes/schemas/quiz';
import { useRouter } from '@/i18n/navigation';

type QuizFormValues = z.input<typeof CreateQuizSchema>;

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

export function QuizForm({
  lessonId,
  courseSlug,
  lessonOrder,
}: {
  lessonId: string;
  courseSlug: string;
  lessonOrder: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('quizzes.new');
  const tToast = useTranslations('quizzes.toast');
  const tError = useTranslations('quizzes.errors');

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(CreateQuizSchema),
    defaultValues: {
      lessonId,
      title: '',
      description: '',
      passingScore: 70,
      isRequired: true,
      timeLimitSec: null,
      maxAttempts: null,
      shuffleChoices: false,
    },
  });

  function onSubmit(values: QuizFormValues) {
    startTransition(async () => {
      const result = await createQuizAction(
        { courseSlug, lessonOrder },
        values,
      );
      if (result.ok) {
        toast.success(tToast('created'));
        router.push(`/instructor/courses/${courseSlug}/quizzes/${result.data.quizId}`);
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('descriptionLabel')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  autoComplete="off"
                  placeholder={t('descriptionPlaceholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passingScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('passingScoreLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t('passingScoreHelper')}</FormDescription>
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
                  id="quiz-isRequired"
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="size-4 rounded border-input"
                />
              </FormControl>
              <FormLabel htmlFor="quiz-isRequired" className="!mt-0">
                {t('requiredLabel')}
              </FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="timeLimitSec"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('timeLimitSecLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={30}
                  max={14400}
                  placeholder={t('timeLimitSecPlaceholder')}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const v = event.target.value;
                    field.onChange(v === '' ? null : event.target.valueAsNumber);
                  }}
                />
              </FormControl>
              <FormDescription>{t('timeLimitSecHelper')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxAttempts"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('maxAttemptsLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  placeholder={t('maxAttemptsPlaceholder')}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    const v = event.target.value;
                    field.onChange(v === '' ? null : event.target.valueAsNumber);
                  }}
                />
              </FormControl>
              <FormDescription>{t('maxAttemptsHelper')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="shuffleChoices"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <input
                  id="quiz-shuffleChoices"
                  type="checkbox"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  className="size-4 rounded border-input"
                />
              </FormControl>
              <FormLabel htmlFor="quiz-shuffleChoices" className="!mt-0">
                {t('shuffleChoicesLabel')}
              </FormLabel>
              <FormDescription className="basis-full">
                {t('shuffleChoicesHelper')}
              </FormDescription>
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
