'use client';

import { useEffect, useTransition } from 'react';
import { type Resolver, useFieldArray, useForm } from 'react-hook-form';
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
import { addQuestionAction } from '@/features/quizzes/actions/add-question';
import { AddQuestionSchema } from '@/features/quizzes/schemas/question';
import { useRouter } from '@/i18n/navigation';

/**
 * Flat form type that covers all three question variants (SINGLE_CHOICE,
 * MULTI_CHOICE, TEXT) without discriminated-union branching.  The resolver
 * still validates against the discriminated AddQuestionSchema, which strips
 * variant-irrelevant fields before returning the parsed value to onSubmit.
 *
 * Using a flat type lets us call form.setValue / form.watch / form.getValues
 * for every field without "as never" casts.
 */
type QuestionFormValues = {
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT';
  quizId: string;
  body: string;
  points: number;
  choices?: { body: string }[];
  correctChoiceIndex?: number;
  correctChoiceIndices?: number[];
};

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
  const base = {
    quizId,
    body: '',
    points: 1,
  };
  if (type === 'TEXT') {
    return { ...base, type: 'TEXT' };
  }
  const baseWithChoices = { ...base, choices: [{ body: '' }, { body: '' }] };
  if (type === 'SINGLE_CHOICE') {
    return { ...baseWithChoices, type: 'SINGLE_CHOICE', correctChoiceIndex: 0 };
  }
  return { ...baseWithChoices, type: 'MULTI_CHOICE', correctChoiceIndices: [] };
}

export function QuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('quizzes.questionForm');
  const tToast = useTranslations('quizzes.toast');
  const tError = useTranslations('quizzes.errors');

  // zodResolver validates against the discriminated AddQuestionSchema.
  // The resolver type expects the same generic as useForm, so we cast once here
  // at the boundary — the flat QuestionFormValues is a superset of every
  // discriminated variant, so all runtime values are valid inputs to the schema.
  const form = useForm<QuestionFormValues>({
    // QuestionFormValues is a flat superset of every discriminated variant.
    // The cast to Resolver<QuestionFormValues> is necessary because zodResolver
    // infers its generic from the schema's discriminated-union input type, which
    // does not extend FieldValues in the same shape.  Using Resolver<T> (not
    // `any`) preserves full type-checking for the rest of the form.
    resolver: zodResolver(AddQuestionSchema) as Resolver<QuestionFormValues>,
    defaultValues: defaultsForType('SINGLE_CHOICE', quizId),
  });

  const choices = useFieldArray({ control: form.control, name: 'choices' });
  const type = form.watch('type');

  // When the type toggles, reset variant-specific correctness fields so the
  // discriminated schema does not see stale data from the other variant.
  useEffect(() => {
    if (type === 'SINGLE_CHOICE') {
      form.setValue('correctChoiceIndex', 0, { shouldValidate: false });
      form.setValue('correctChoiceIndices', undefined, { shouldValidate: false });
    } else if (type === 'MULTI_CHOICE') {
      form.setValue('correctChoiceIndices', [], { shouldValidate: false });
      form.setValue('correctChoiceIndex', undefined, { shouldValidate: false });
    } else {
      // TEXT — no correctness fields needed
      form.setValue('correctChoiceIndex', undefined, { shouldValidate: false });
      form.setValue('correctChoiceIndices', undefined, { shouldValidate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function onSubmit(values: QuestionFormValues) {
    startTransition(async () => {
      // addQuestionAction accepts unknown and runs AddQuestionSchema.safeParse
      // internally, so passing the flat QuestionFormValues is correct.
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

  const currentMultiIndices: number[] = form.watch('correctChoiceIndices') ?? [];

  function toggleMultiIndex(index: number) {
    const current = (form.getValues('correctChoiceIndices') ?? []).slice();
    const pos = current.indexOf(index);
    if (pos >= 0) {
      current.splice(pos, 1);
    } else {
      current.push(index);
      current.sort((a, b) => a - b);
    }
    form.setValue('correctChoiceIndices', current, { shouldValidate: true });
  }

  const currentSingleIndex: number | undefined = form.watch('correctChoiceIndex');

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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="question-type"
                value="TEXT"
                checked={type === 'TEXT'}
                onChange={() => form.setValue('type', 'TEXT', { shouldValidate: false })}
              />
              {t('typeText')}
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {type === 'SINGLE_CHOICE'
              ? t('typeSingleHelper')
              : type === 'MULTI_CHOICE'
                ? t('typeMultiHelper')
                : t('typeTextHelper')}
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

        {type !== 'TEXT' ? (
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
                        form.setValue('correctChoiceIndex', index, {
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
                        <FormLabel className="sr-only">
                          {t('choicePlaceholder', { index: index + 1 })}
                        </FormLabel>
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
            {form.formState.errors.correctChoiceIndex?.message ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.correctChoiceIndex.message}
              </p>
            ) : null}
            {form.formState.errors.correctChoiceIndices?.message ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.correctChoiceIndices.message}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
