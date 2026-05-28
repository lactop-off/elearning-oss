import { BookOpen } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

// テーマの chart トークンから決定的に 1 色を選び、コースごとにカバー帯の色を変える。
// 文字列リテラルで列挙することで Tailwind のクラス検出に乗せる (動的生成は不可)。
const COVER_STYLES = [
  'bg-chart-1/15 text-chart-1',
  'bg-chart-2/15 text-chart-2',
  'bg-chart-3/15 text-chart-3',
  'bg-chart-4/15 text-chart-4',
  'bg-chart-5/15 text-chart-5',
] as const;

function coverStyle(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return COVER_STYLES[hash % COVER_STYLES.length];
}

/**
 * コース一覧で共通利用するカード。カタログ / My Learning / 講師一覧で
 * 見た目を統一する。可変部分 (バッジ・操作・CTA) は slot で受け取る。
 */
export function CourseCard({
  title,
  description,
  seed,
  badges,
  action,
  meta,
  footer,
}: {
  title: React.ReactNode;
  description?: string | null;
  seed: string;
  badges?: React.ReactNode;
  action?: React.ReactNode;
  meta?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="h-full pt-0 transition-shadow hover:shadow-md">
      <div
        className={cn(
          'flex h-20 items-center justify-center',
          coverStyle(seed),
        )}
        aria-hidden="true"
      >
        <BookOpen className="size-8 transition-transform group-hover/card:scale-110" />
      </div>

      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1.5">
            {badges ? (
              <div className="flex flex-wrap items-center gap-1.5">{badges}</div>
            ) : null}
            <CardTitle asChild>
              <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            </CardTitle>
            {meta ? <CardDescription>{meta}</CardDescription> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </CardHeader>

      {description ? (
        <CardContent className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </CardContent>
      ) : null}

      {footer ? <CardFooter className="mt-auto">{footer}</CardFooter> : null}
    </Card>
  );
}
