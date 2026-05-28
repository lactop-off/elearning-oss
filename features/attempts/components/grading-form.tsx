'use client';

import { Check, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { gradeAttemptAction } from '@/features/attempts/actions/grade-attempt';
import type { GradingAnswer } from '@/features/attempts/data/attempts';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type GradingState = {
  isCorrect: boolean | null;
  pointsAwarded: number;
};

const KNOWN = [
  'INVALID_INPUT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'NOT_PENDING',
  'INVALID_GRADINGS',
  'POINTS_EXCEED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN)[number];

function isKnown(code: string): code is KnownErrorCode {
  return (KNOWN as readonly string[]).includes(code);
}

export function GradingForm({
  attemptId,
  courseSlug,
  answers,
}: {
  attemptId: string;
  courseSlug: string;
  answers: GradingAnswer[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('quizzes.grading');
  const tToast = useTranslations('quizzes.grading.toast');
  const tError = useTranslations('quizzes.grading.errors');

  const [gradings, setGradings] = useState<Record<string, GradingState>>(() => {
    const initial: Record<string, GradingState> = {};
    for (const a of answers) {
      initial[a.answerId] = {
        isCorrect: a.currentIsCorrect,
        pointsAwarded: a.currentPointsAwarded ?? 0,
      };
    }
    return initial;
  });

  function setCorrect(answerId: string, points: number) {
    setGradings((prev) => ({
      ...prev,
      [answerId]: { isCorrect: true, pointsAwarded: points },
    }));
  }
  function setIncorrect(answerId: string) {
    setGradings((prev) => ({
      ...prev,
      [answerId]: { isCorrect: false, pointsAwarded: 0 },
    }));
  }

  const allDecided = answers.every((a) => gradings[a.answerId]?.isCorrect !== null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!allDecided) return;

    const payload = {
      attemptId,
      gradings: answers.map((a) => ({
        answerId: a.answerId,
        isCorrect: gradings[a.answerId].isCorrect === true,
        pointsAwarded: gradings[a.answerId].pointsAwarded,
      })),
    };

    startTransition(async () => {
      const result = await gradeAttemptAction(payload);
      if (result.ok) {
        const score = result.data.score;
        toast.success(
          result.data.passed
            ? tToast('gradedPassed', { score })
            : tToast('graded', { score }),
        );
        router.push(`/instructor/courses/${courseSlug}`);
        router.refresh();
        return;
      }
      toast.error(isKnown(result.error) ? tError(result.error) : tError('INTERNAL_ERROR'));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <ol className="grid gap-4">
        {answers.map((answer) => {
          const state = gradings[answer.answerId];
          const correct = state?.isCorrect === true;
          const incorrect = state?.isCorrect === false;
          return (
            <li key={answer.answerId}>
              <Card>
                <CardHeader>
                  <div className="grid gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('questionLabel')} · {answer.questionPoints}pt
                    </p>
                    <p className="font-medium leading-snug">{answer.questionBody}</p>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('modelAnswerLabel')}
                    </p>
                    <p className="rounded-md border border-dashed border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                      {answer.modelAnswer && answer.modelAnswer.length > 0
                        ? answer.modelAnswer
                        : t('modelAnswerEmpty')}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t('learnerAnswerLabel')}
                    </p>
                    <p className="rounded-md border border-border bg-card p-3 text-sm whitespace-pre-wrap">
                      {answer.textAnswer}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={correct ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCorrect(answer.answerId, answer.questionPoints)}
                      aria-pressed={correct}
                    >
                      <Check aria-hidden="true" />
                      {t('markCorrect')}
                    </Button>
                    <Button
                      type="button"
                      variant={incorrect ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => setIncorrect(answer.answerId)}
                      aria-pressed={incorrect}
                    >
                      <X aria-hidden="true" />
                      {t('markIncorrect')}
                    </Button>
                    <span
                      className={cn(
                        'ml-auto text-sm font-medium',
                        state?.isCorrect === null && 'text-muted-foreground',
                      )}
                    >
                      {state?.pointsAwarded ?? 0} / {answer.questionPoints} pt
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      <Button type="submit" disabled={isPending || !allDecided} size="lg">
        {isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
