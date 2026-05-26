import { getTranslations } from 'next-intl/server';

export async function ProgressSummary({
  completed,
  total,
  requiredCompleted,
  requiredTotal,
}: {
  completed: number;
  total: number;
  requiredCompleted: number;
  requiredTotal: number;
}) {
  const t = await getTranslations('progress.summary');
  const percent =
    requiredTotal === 0 ? 0 : Math.round((requiredCompleted / requiredTotal) * 100);

  return (
    <div className="grid gap-2" aria-label={t('aria')}>
      <div className="flex items-center justify-between text-sm">
        <span>{t('completedOfTotal', { completed, total })}</span>
        <span className="text-muted-foreground">
          {t('requiredCompletion', { percent })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('ariaProgressBar', { percent })}
        className="h-2 w-full overflow-hidden rounded bg-muted"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
