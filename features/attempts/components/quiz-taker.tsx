'use client';

import { Send } from 'lucide-react';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
        if (result.data.pending) {
          // TEXT answers waiting on the instructor; no numeric score yet.
          toast.success(tToast('pending'));
        } else if (result.data.passed === true) {
          toast.success(tToast('passed', { score: result.data.score ?? 0 }));
        } else {
          toast.success(tToast('submitted', { score: result.data.score ?? 0 }));
        }
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <ol aria-label={t('questionsAria')} className="grid gap-4">
        {questions.map((question) => {
          const isMulti = question.type === 'MULTI_CHOICE';
          return (
            <li key={question.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">
                      {t('pointsLabel', { points: question.points })}
                    </Badge>
                    <Badge variant={isMulti ? 'primarySoft' : 'outline'}>
                      {isMulti ? t('typeMulti') : t('typeSingle')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <fieldset className="grid gap-3">
                    <legend className="text-base font-medium leading-snug">
                      <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {question.order}
                      </span>
                      {question.body}
                    </legend>
                    <div className="grid gap-2">
                      {question.choices.map((choice) => (
                        <label
                          key={choice.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring has-[input:checked]:border-primary has-[input:checked]:bg-primary/5"
                        >
                          <input
                            type={isMulti ? 'checkbox' : 'radio'}
                            name={`q-${question.id}`}
                            value={choice.id}
                            className="size-4 accent-primary"
                          />
                          <span>{choice.body}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <Button type="submit" disabled={isPending} size="lg">
        <Send aria-hidden="true" />
        {isPending ? t('working') : t('submit')}
      </Button>
    </form>
  );
}
