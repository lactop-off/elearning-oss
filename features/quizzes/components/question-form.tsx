'use client';

import { useTransition } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
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
import { addQuestionAction } from '@/features/quizzes/actions/add-question';
import { AddSingleChoiceQuestionSchema } from '@/features/quizzes/schemas/question';
import { useRouter } from '@/i18n/navigation';

type QuestionFormValues = z.input<typeof AddSingleChoiceQuestionSchema>;

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'QUIZ_NOT_FOUND',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function QuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('quizzes.questionForm');
  const tToast = useTranslations('quizzes.toast');
  const tError = useTranslations('quizzes.errors');

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(AddSingleChoiceQuestionSchema),
    defaultValues: {
      quizId,
      body: '',
      points: 1,
      choices: [{ body: '' }, { body: '' }],
      correctChoiceIndex: 0,
    },
  });

  const choices = useFieldArray({ control: form.control, name: 'choices' });

  function onSubmit(values: QuestionFormValues) {
    startTransition(async () => {
      const result = await addQuestionAction(values);
      if (result.ok) {
        toast.success(tToast('questionAdded'));
        form.reset({
          quizId,
          body: '',
          points: 1,
          choices: [{ body: '' }, { body: '' }],
          correctChoiceIndex: 0,
        });
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
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('bodyLabel')}</FormLabel>
              <FormControl>
                <Input autoComplete="off" placeholder={t('bodyPlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="points"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('pointsLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                />
              </FormControl>
              <FormDescription>{t('pointsHelper')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">{t('choicesLabel')}</legend>
          <p className="text-xs text-muted-foreground">{t('choicesHelper')}</p>
          {choices.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="correctChoiceIndex"
                  value={index}
                  checked={form.watch('correctChoiceIndex') === index}
                  onChange={() =>
                    form.setValue('correctChoiceIndex', index, { shouldValidate: true })
                  }
                  aria-label={t('correctAria', { index: index + 1 })}
                />
                <span className="sr-only">{t('correctAria', { index: index + 1 })}</span>
              </label>
              <FormField
                control={form.control}
                name={`choices.${index}.body`}
                render={({ field: bodyField }) => (
                  <FormItem className="grid gap-0">
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder={t('choicePlaceholder', { index: index + 1 })}
                        {...bodyField}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => choices.remove(index)}
                disabled={choices.fields.length <= 2}
                aria-label={t('removeChoiceAria', { index: index + 1 })}
              >
                {t('removeChoice')}
              </Button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => choices.append({ body: '' })}
              disabled={choices.fields.length >= 6}
            >
              {t('addChoice')}
            </Button>
          </div>
          {form.formState.errors.correctChoiceIndex ? (
            <p className="text-destructive text-sm">
              {form.formState.errors.correctChoiceIndex.message}
            </p>
          ) : null}
        </fieldset>

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
