import { getTranslations } from 'next-intl/server';

import type { AnswerForResult } from '@/features/attempts/data/attempts';

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
  status,
  passingScore,
  questions,
  answers,
  correctChoiceIdsByQuestionId,
}: {
  score: number | null;
  passed: boolean | null;
  status: 'SUBMITTED' | 'PENDING_REVIEW' | 'AUTO_SUBMITTED' | 'ABANDONED';
  passingScore: number;
  questions: ResultQuestion[];
  answers: AnswerForResult[];
  correctChoiceIdsByQuestionId: Map<string, Set<string>>;
}) {
  const t = await getTranslations('attempts.result');
  const answerByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  const isPendingReview = status === 'PENDING_REVIEW';

  return (
    <div className="grid gap-6">
      {isPendingReview ? (
        <aside
          role="region"
          aria-labelledby="result-heading"
          className="grid gap-2 rounded-lg border border-amber-400/40 bg-amber-50/50 p-4 dark:bg-amber-900/10"
        >
          <h2 id="result-heading" className="text-base font-semibold">
            {t('pendingTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('pendingBody')}</p>
        </aside>
      ) : (
        <aside
          role="region"
          aria-labelledby="result-heading"
          className={
            passed
              ? 'grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-4'
              : 'grid gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4'
          }
        >
          <h2 id="result-heading" className="text-base font-semibold">
            {passed ? t('passTitle') : t('failTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('scoreSummary', { score: score ?? 0, passing: passingScore })}
          </p>
        </aside>
      )}

      <ol aria-label={t('breakdownAria')} className="grid gap-4">
        {questions.map((question) => {
          const answer = answerByQuestion.get(question.id);
          const correctIds = correctChoiceIdsByQuestionId.get(question.id) ?? new Set<string>();

          if (question.type === 'TEXT') {
            const textAnswer = answer?.textAnswer ?? null;
            const pointsAwarded = answer?.pointsAwarded ?? null;
            const isGraded = pointsAwarded !== null;

            return (
              <li key={question.id}>
                <div className="grid gap-2 rounded-lg border p-4">
                  <p className="font-medium">
                    <span className="mr-2 text-muted-foreground">{question.order}.</span>
                    {question.body}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isGraded
                      ? t('textGraded', {
                          awarded: pointsAwarded,
                          possible: question.points,
                        })
                      : t('awaitingGrade')}
                  </p>
                  <div className="rounded bg-muted/40 px-3 py-2 text-sm">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t('textAnswerLabel')}
                    </p>
                    <p className="whitespace-pre-wrap">
                      {textAnswer ?? (
                        <em className="text-muted-foreground">{t('awaitingGrade')}</em>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li key={question.id}>
              <div className="grid gap-2 rounded-lg border p-4">
                <p className="font-medium">
                  <span className="mr-2 text-muted-foreground">{question.order}.</span>
                  {question.body}
                </p>
                <p className="text-xs text-muted-foreground">
                  {answer?.isCorrect
                    ? t('correct', { points: question.points })
                    : t('incorrect', {
                        awarded: answer?.pointsAwarded ?? 0,
                        possible: question.points,
                      })}
                </p>
                <ul aria-label={t('choicesAria')} className="grid gap-1 text-sm">
                  {question.choices.map((choice) => {
                    const isSelected = answer?.selectedChoiceIds.includes(choice.id) ?? false;
                    const isCorrect = correctIds.has(choice.id);
                    let className = 'rounded px-2 py-1';
                    if (isCorrect) {
                      className += ' bg-primary/10 text-primary';
                    } else if (isSelected) {
                      className += ' bg-destructive/10 text-destructive';
                    }
                    return (
                      <li key={choice.id} className={className}>
                        <span className="mr-2 text-muted-foreground">
                          {String.fromCharCode(64 + choice.order)}.
                        </span>
                        {choice.body}
                        {isCorrect ? (
                          <span className="ml-2 text-xs font-medium">{t('correctMarker')}</span>
                        ) : null}
                        {isSelected && !isCorrect ? (
                          <span className="ml-2 text-xs font-medium">{t('yourPickMarker')}</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
