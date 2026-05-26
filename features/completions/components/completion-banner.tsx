import { getTranslations } from 'next-intl/server';

export async function CompletionBanner({
  completedAt,
  serial,
}: {
  completedAt: Date;
  serial: string | null;
}) {
  const t = await getTranslations('completions.banner');
  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <aside
      role="status"
      aria-labelledby="completion-banner-title"
      className="grid gap-2 rounded-lg border border-primary/40 bg-primary/5 p-4"
    >
      <h2 id="completion-banner-title" className="text-base font-semibold">
        {t('title')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t('description', { date: formatter.format(completedAt) })}
      </p>
      {serial ? (
        <p className="text-xs">
          <span className="text-muted-foreground">{t('serialLabel')}: </span>
          <span className="font-mono">{serial}</span>
        </p>
      ) : null}
    </aside>
  );
}
