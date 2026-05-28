'use client';

import { useEffect, useTransition } from 'react';
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
import { AddQuestionSchema } from '@/features/quizzes/schemas/question';
import { useRouter } from '@/i18n/navigation';

type QuestionFormValues = z.input<typeof AddQuestionSchema>;

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

function defaultsForType(
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT',
  quizId: string,
): QuestionFormValues {
  const base = { quizId, body: '', points: 1 };
  if (type === 'TEXT') {
    return { ...base, type: 'TEXT', modelAnswer: '' };
  }
  const withChoices = { ...base, choices: [{ body: '' }, { body: '' }] };
  if (type === 'SINGLE_CHOICE') {
    return { ...withChoices, type: 'SINGLE_CHOICE', correctChoiceIndex: 0 };
  }
  return { ...withChoices, type: 'MULTI_CHOICE', correctChoiceIndices: [] };
}

export function QuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('quizzes.questionForm');
  const tToast = useTranslations('quizzes.toast');
  const tError = useTranslations('quizzes.errors');

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(AddQuestionSchema),
    defaultValues: defaultsForType('SINGLE_CHOICE', quizId),
  });

  const choices = useFieldArray({ control: form.control, name: 'choices' });
  const type = form.watch('type');

  // When the type toggles, reset the correctness fields so the discriminated
  // schema doesn't see stale data from the other variant.
  useEffect(() => {
    const current = form.getValues();
    if (type === 'SINGLE_CHOICE') {
      form.setValue('correctChoiceIndex' as never, 0 as never, { shouldValidate: false });
      form.unregister('correctChoiceIndices' as never);
    } else {
      form.setValue('correctChoiceIndices' as never, [] as never, { shouldValidate: false });
      form.unregister('correctChoiceIndex' as never);
    }
    void current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function onSubmit(values: QuestionFormValues) {
    startTransition(async () => {
      const result = await addQuestionAction(values);
      if (result.ok) {
        toast.success(tToast('questionAdded'));
        form.reset(defaultsForType(type, quizId));
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  const currentMultiIndices = ((form.watch('correctChoiceIndices' as never) as unknown) ??
    []) as number[];

  function toggleMultiIndex(index: number) {
    const current = (((form.getValues('correctChoiceIndices' as never) as unknown) ??
      []) as number[]).slice();
    const pos = current.indexOf(index);
    if (pos >= 0) {
      current.splice(pos, 1);
    } else {
      current.push(index);
      current.sort((a, b) => a - b);
    }
    form.setValue('correctChoiceIndices' as never, current as never, { shouldValidate: true });
  }

  const currentSingleIndex = form.watch('correctChoiceIndex' as never) as unknown as
    | number
    | undefined;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-medium">{t('typeLabel')}</legend>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="question-type"
                value="SINGLE_CHOICE"
                checked={type === 'SINGLE_CHOICE'}
                onChange={() => form.setValue('type', 'SINGLE_CHOICE', { shouldValidate: false })}
              />
              {t('typeSingle')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="question-type"
                value="MULTI_CHOICE"
                checked={type === 'MULTI_CHOICE'}
                onChange={() => form.setValue('type', 'MULTI_CHOICE', { shouldValidate: false })}
              />
              {t('typeMulti')}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {type === 'SINGLE_CHOICE' ? t('typeSingleHelper') : t('typeMultiHelper')}
          </p>
        </fieldset>

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
          <p className="text-xs text-muted-foreground">
            {type === 'SINGLE_CHOICE' ? t('choicesHelper') : t('choicesHelperMulti')}
          </p>
          {choices.fields.map((field, index) => {
            const singleChecked = type === 'SINGLE_CHOICE' && currentSingleIndex === index;
            const multiChecked = type === 'MULTI_CHOICE' && currentMultiIndices.includes(index);
            return (
              <div key={field.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                {type === 'SINGLE_CHOICE' ? (
                  <input
                    type="radio"
                    name="correctChoiceIndex"
                    value={index}
                    checked={singleChecked}
                    onChange={() =>
                      form.setValue('correctChoiceIndex' as never, index as never, {
                        shouldValidate: true,
                      })
                    }
                    aria-label={t('correctAria', { index: index + 1 })}
                  />
                ) : (
                  <input
                    type="checkbox"
                    name={`correctChoiceIndices-${index}`}
                    value={index}
                    checked={multiChecked}
                    onChange={() => toggleMultiIndex(index)}
                    aria-label={t('correctAria', { index: index + 1 })}
                  />
                )}
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
            );
          })}
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
          {(form.formState.errors as Record<string, { message?: string } | undefined>)
            .correctChoiceIndex?.message ? (
            <p className="text-destructive text-sm">
              {(form.formState.errors as Record<string, { message?: string }>).correctChoiceIndex.message}
            </p>
          ) : null}
          {(form.formState.errors as Record<string, { message?: string } | undefined>)
            .correctChoiceIndices?.message ? (
            <p className="text-destructive text-sm">
              {(form.formState.errors as Record<string, { message?: string }>).correctChoiceIndices.message}
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
