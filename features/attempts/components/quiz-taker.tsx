'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { submitAttemptAction } from '@/features/attempts/actions/submit-attempt';
import { useRouter } from '@/i18n/navigation';

type QuestionInput = {
  id: string;
  body: string;
  order: number;
  points: number;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT';
  choices: { id: string; body: string; order: number }[];
};

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'NOT_FOUND',
  'NOT_IN_PROGRESS',
  'INVALID_ANSWERS',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function QuizTaker({
  courseSlug,
  attemptId,
  questions,
}: {
  courseSlug: string;
  attemptId: string;
  questions: QuestionInput[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('attempts.take');
  const tToast = useTranslations('attempts.toast');
  const tError = useTranslations('attempts.errors');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const answers: { questionId: string; choiceIds: string[] }[] = [];
    for (const question of questions) {
      const raw = formData.getAll(`q-${question.id}`);
      const choiceIds = raw.filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );
      if (choiceIds.length > 0) {
        answers.push({ questionId: question.id, choiceIds });
      }
    }
    if (answers.length === 0) {
      toast.error(t('selectAtLeastOne'));
      return;
    }

    startTransition(async () => {
      const result = await submitAttemptAction({ courseSlug }, { attemptId, answers });
      if (result.ok) {
        toast.success(
          result.data.passed
            ? tToast('passed', { score: result.data.score })
            : tToast('submitted', { score: result.data.score }),
        );
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <ol aria-label={t('questionsAria')} className="grid gap-6">
        {questions.map((question) => {
          const isMulti = question.type === 'MULTI_CHOICE';
          return (
            <li key={question.id}>
              <fieldset className="grid gap-3">
                <legend className="text-base font-medium">
                  <span className="mr-2 text-muted-foreground">{question.order}.</span>
                  {question.body}
                </legend>
                <p className="text-xs text-muted-foreground">
                  {t('pointsLabel', { points: question.points })}
                  {' · '}
                  {isMulti ? t('typeMulti') : t('typeSingle')}
                </p>
                <div className="grid gap-2">
                  {question.choices.map((choice) => (
                    <label
                      key={choice.id}
                      className="flex items-center gap-2 rounded border px-3 py-2 has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                    >
                      <input
                        type={isMulti ? 'checkbox' : 'radio'}
                        name={`q-${question.id}`}
                        value={choice.id}
                        className="size-4"
                      />
                      <span className="text-sm">{choice.body}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <Button type="submit" disabled={isPending} size="lg">
        {isPending ? t('working') : t('submit')}
      </Button>
    </form>
  );
}
