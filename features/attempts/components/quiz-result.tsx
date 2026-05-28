import { Check, CheckCircle2, Clock, X, XCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { AnswerForResult } from '@/features/attempts/data/attempts';
import { cn } from '@/lib/utils';

type ResultQuestion = {
  id: string;
  body: string;
  order: number;
  points: number;
  type: 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'TEXT';
  choices: { id: string; body: string; order: number }[];
};

export async function QuizResult({
  score,
  passed,
  passingScore,
  questions,
  answers,
  correctChoiceIdsByQuestionId,
}: {
  // When score/passed are null, the attempt has at least one TEXT answer
  // waiting for the instructor — display the "awaiting review" banner.
  score: number | null;
  passed: boolean | null;
  passingScore: number;
  questions: ResultQuestion[];
  answers: AnswerForResult[];
  correctChoiceIdsByQuestionId: Map<string, Set<string>>;
}) {
  const t = await getTranslations('attempts.result');
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const isPending = passed === null;

  return (
    <div className="grid gap-6">
      <aside
        role="status"
        aria-labelledby="result-heading"
        className={cn(
          'flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center',
          isPending
            ? 'border-muted-foreground/30 bg-muted/40'
            : passed
              ? 'border-primary/40 bg-primary/5'
              : 'border-destructive/40 bg-destructive/5',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full',
            isPending
              ? 'bg-muted text-muted-foreground'
              : passed
                ? 'bg-primary/10 text-primary'
                : 'bg-destructive/10 text-destructive',
          )}
        >
          {isPending ? (
            <Clock className="size-8" />
          ) : passed ? (
            <CheckCircle2 className="size-8" />
          ) : (
            <XCircle className="size-8" />
          )}
        </span>
        <div className="grid gap-1">
          <h2
            id="result-heading"
            className={cn(
              'text-xl font-semibold tracking-tight',
              isPending
                ? 'text-foreground'
                : passed
                  ? 'text-primary'
                  : 'text-destructive',
            )}
          >
            {isPending ? t('pendingTitle') : passed ? t('passTitle') : t('failTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isPending
              ? t('pendingSummary')
              : t('scoreSummary', { score: score ?? 0, passing: passingScore })}
          </p>
        </div>
      </aside>

      <ol aria-label={t('breakdownAria')} className="grid gap-4">
        {questions.map((question) => {
          const answer = answerByQuestion.get(question.id);
          const correctIds = correctChoiceIdsByQuestionId.get(question.id) ?? new Set<string>();
          const isText = question.type === 'TEXT';
          const isAnswered = answer !== undefined;
          // Pending iff the answer exists and isCorrect is still null
          // (manual grading not done yet).
          const isPendingQuestion = isAnswered && answer.isCorrect === null;
          const isCorrect = answer?.isCorrect === true;
          return (
            <li key={question.id}>
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full',
                        isPendingQuestion
                          ? 'bg-muted text-muted-foreground'
                          : isCorrect
                            ? 'bg-primary/10 text-primary'
                            : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {isPendingQuestion ? (
                        <Clock className="size-4" />
                      ) : isCorrect ? (
                        <Check className="size-4" />
                      ) : (
                        <X className="size-4" />
                      )}
                    </span>
                    <div className="grid gap-1">
                      <p className="font-medium leading-snug">
                        <span className="mr-2 text-muted-foreground">
                          {question.order}.
                        </span>
                        {question.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPendingQuestion
                          ? t('pendingMarker')
                          : isCorrect
                            ? t('correct', { points: question.points })
                            : t('incorrect', {
                                awarded: answer?.pointsAwarded ?? 0,
                                possible: question.points,
                              })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isText ? (
                    <div className="grid gap-1 text-sm">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t('yourTextAnswerLabel')}
                      </p>
                      <p className="rounded-md border border-border bg-muted/40 p-3 whitespace-pre-wrap">
                        {answer?.textAnswer && answer.textAnswer.length > 0
                          ? answer.textAnswer
                          : t('emptyTextAnswer')}
                      </p>
                    </div>
                  ) : (
                    <ul aria-label={t('choicesAria')} className="grid gap-1 text-sm">
                      {question.choices.map((choice) => {
                        const isSelected =
                          answer?.selectedChoiceIds.includes(choice.id) ?? false;
                        const isCorrectChoice = correctIds.has(choice.id);
                        return (
                          <li
                            key={choice.id}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1.5',
                              isCorrectChoice && 'bg-primary/10 text-primary',
                              isSelected &&
                                !isCorrectChoice &&
                                'bg-destructive/10 text-destructive',
                            )}
                          >
                            <span className="text-muted-foreground">
                              {String.fromCharCode(64 + choice.order)}.
                            </span>
                            <span className="flex-1">{choice.body}</span>
                            {isCorrectChoice ? (
                              <span className="ml-2 text-xs font-medium">
                                {t('correctMarker')}
                              </span>
                            ) : null}
                            {isSelected && !isCorrectChoice ? (
                              <span className="ml-2 text-xs font-medium">
                                {t('yourPickMarker')}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
