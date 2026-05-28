'use client';

import { Send, Timer } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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

type SubmissionAnswer = {
  questionId: string;
  choiceIds?: string[];
  textAnswer?: string;
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

function formatMmSs(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function QuizTaker({
  courseSlug,
  attemptId,
  questions,
  timeLimitSec,
  startedAt,
}: {
  courseSlug: string;
  attemptId: string;
  questions: QuestionInput[];
  // When both are provided, render a countdown timer and auto-submit at 0.
  timeLimitSec?: number | null;
  startedAt?: Date | string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('attempts.take');
  const tToast = useTranslations('attempts.toast');
  const tError = useTranslations('attempts.errors');

  const deadlineMs =
    timeLimitSec != null && startedAt
      ? new Date(startedAt).getTime() + timeLimitSec * 1000
      : null;

  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    deadlineMs !== null ? deadlineMs - Date.now() : null,
  );
  const submittedRef = useRef(false);

  function submit(autoSubmitted: boolean) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const answers: SubmissionAnswer[] = [];
    for (const question of questions) {
      const fieldName = `q-${question.id}`;
      if (question.type === 'TEXT') {
        const value = formData.get(fieldName);
        const text = typeof value === 'string' ? value.trim() : '';
        if (text.length > 0) {
          answers.push({ questionId: question.id, textAnswer: text });
        }
        continue;
      }
      const raw = formData.getAll(fieldName);
      const choiceIds = raw.filter(
        (value): value is string => typeof value === 'string' && value.length > 0,
      );
      if (choiceIds.length > 0) {
        answers.push({ questionId: question.id, choiceIds });
      }
    }
    // Reject early submission with nothing filled, but let auto-submit through
    // — the timer expired and we want the AUTO_SUBMITTED attempt recorded.
    if (!autoSubmitted && answers.length === 0) {
      submittedRef.current = false;
      toast.error(t('selectAtLeastOne'));
      return;
    }

    startTransition(async () => {
      const result = await submitAttemptAction(
        { courseSlug },
        { attemptId, answers, autoSubmitted },
      );
      if (result.ok) {
        if (autoSubmitted) {
          toast.message(t('autoSubmittedNotice'));
        } else if (result.data.pending) {
          toast.success(tToast('pending'));
        } else if (result.data.passed === true) {
          toast.success(tToast('passed', { score: result.data.score ?? 0 }));
        } else {
          toast.success(tToast('submitted', { score: result.data.score ?? 0 }));
        }
        router.refresh();
        return;
      }
      submittedRef.current = false;
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(false);
  }

  // Countdown tick + auto-submit on expiry.
  useEffect(() => {
    if (deadlineMs === null) return;
    const tick = () => {
      const left = deadlineMs - Date.now();
      setRemainingMs(left);
      if (left <= 0) {
        submit(true);
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
    // submit is intentionally captured via closure for the latest form state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadlineMs]);

  const expired = remainingMs !== null && remainingMs <= 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="grid gap-6">
      {deadlineMs !== null ? (
        <div
          role="timer"
          aria-live="polite"
          aria-atomic="true"
          className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-2 backdrop-blur"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Timer aria-hidden="true" className="size-4" />
            {t('timeRemainingLabel')}
          </span>
          <span className="font-mono text-base font-semibold tabular-nums">
            {formatMmSs(remainingMs ?? 0)}
          </span>
        </div>
      ) : null}

      <ol aria-label={t('questionsAria')} className="grid gap-4">
        {questions.map((question) => {
          const isMulti = question.type === 'MULTI_CHOICE';
          const isText = question.type === 'TEXT';
          const typeLabel = isText
            ? t('typeText')
            : isMulti
              ? t('typeMulti')
              : t('typeSingle');
          const typeVariant: 'primarySoft' | 'outline' = isMulti || isText
            ? 'primarySoft'
            : 'outline';
          return (
            <li key={question.id}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="muted">
                      {t('pointsLabel', { points: question.points })}
                    </Badge>
                    <Badge variant={typeVariant}>{typeLabel}</Badge>
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
                    {isText ? (
                      <Textarea
                        name={`q-${question.id}`}
                        rows={5}
                        placeholder={t('textAnswerPlaceholder')}
                        aria-label={t('textAnswerAria', { order: question.order })}
                      />
                    ) : (
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
                    )}
                  </fieldset>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <Button type="submit" disabled={isPending || expired} size="lg">
        <Send aria-hidden="true" />
        {isPending ? t('working') : t('submit')}
      </Button>
    </form>
  );
}
