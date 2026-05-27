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
import { gradeAttemptAction } from '@/features/attempts/actions/grade-attempt';
import type { AttemptForGrading } from '@/features/attempts/data/grading';
import { useRouter } from '@/i18n/navigation';

type TextItem = AttemptForGrading['textItems'][number];

const KNOWN_ERRORS = [
  'FORBIDDEN',
  'NOT_FOUND',
  'NOT_PENDING',
  'INVALID_GRADES',
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN_ERRORS)[number];

function isKnownError(code: string): code is KnownErrorCode {
  return (KNOWN_ERRORS as readonly string[]).includes(code);
}

function buildGradeFormSchema(textItems: TextItem[]) {
  const shape: Record<string, z.ZodNumber> = {};
  for (const item of textItems) {
    shape[item.questionId] = z.number().int().min(0).max(item.points);
  }
  return z.object(shape);
}

type GradeFormValues = Record<string, number>;

export function GradeForm({ attemptId, textItems }: { attemptId: string; textItems: TextItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('instructor.grading');

  const schema = buildGradeFormSchema(textItems);

  const defaultValues: GradeFormValues = {};
  for (const item of textItems) {
    defaultValues[item.questionId] = item.pointsAwarded ?? 0;
  }

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function onSubmit(values: GradeFormValues) {
    startTransition(async () => {
      const grades = textItems.map((item) => ({
        questionId: item.questionId,
        pointsAwarded: values[item.questionId] ?? 0,
      }));

      const result = await gradeAttemptAction({ attemptId, grades });

      if (result.ok) {
        toast.success(t('successToast'));
        router.push('/instructor/grading');
        return;
      }

      const errorCode = result.error;
      toast.error(isKnownError(errorCode) ? t(`errors.${errorCode}`) : t('errors.INTERNAL_ERROR'));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8">
        <ol aria-label={t('questionsLabel')} className="grid gap-6">
          {textItems.map((item, index) => (
            <li key={item.questionId}>
              <div className="grid gap-3 rounded-lg border p-4">
                <p className="font-medium">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {item.body}
                </p>

                <div className="rounded bg-muted/40 px-3 py-2 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {t('textAnswerLabel')}
                  </p>
                  <p className="whitespace-pre-wrap">
                    {item.textAnswer ?? <em className="text-muted-foreground">{t('noAnswer')}</em>}
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name={item.questionId}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor={`grade-${item.questionId}`}>
                        {t('pointsLabel', { max: item.points })}
                      </FormLabel>
                      <FormControl>
                        <Input
                          id={`grade-${item.questionId}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={item.points}
                          value={field.value}
                          onChange={(event) => field.onChange(event.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>{t('pointsHelper', { max: item.points })}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </li>
          ))}
        </ol>

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
