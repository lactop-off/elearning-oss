import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { QuestionWithChoices } from '@/features/quizzes/data/questions';

export async function QuestionList({ questions }: { questions: QuestionWithChoices[] }) {
  const t = await getTranslations('quizzes.questionList');

  if (questions.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
      >
        {t('empty')}
      </div>
    );
  }

  return (
    <ol aria-label={t('listAria')} className="grid gap-3">
      {questions.map((question) => (
        <li key={question.id}>
          <Card>
            <CardHeader>
              <CardTitle asChild>
                <h3 className="text-base">
                  <span className="mr-2 text-muted-foreground">{question.order}.</span>
                  {question.body}
                </h3>
              </CardTitle>
              <CardDescription>
                {t('pointsLabel', { points: question.points })}
                {' · '}
                {question.type === 'MULTI_CHOICE'
                  ? t('typeMulti')
                  : t('typeSingle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul aria-label={t('choicesAria')} className="grid gap-1 text-sm">
                {question.choices.map((choice) => (
                  <li
                    key={choice.id}
                    className={
                      choice.isCorrect
                        ? 'rounded bg-primary/10 px-2 py-1 text-primary'
                        : 'rounded px-2 py-1'
                    }
                  >
                    <span className="mr-2 text-muted-foreground">
                      {String.fromCharCode(64 + choice.order)}.
                    </span>
                    {choice.body}
                    {choice.isCorrect ? (
                      <span className="ml-2 text-xs font-medium">
                        {t('correctMarker')}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  );
}
