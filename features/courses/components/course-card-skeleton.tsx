import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** CourseCard のローディング用プレースホルダ。カバー帯 + 見出し + 本文を模す。 */
export function CourseCardSkeleton() {
  return (
    <Card className="h-full pt-0">
      <Skeleton className="h-20 rounded-none" />
      <CardHeader>
        <div className="grid gap-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </CardContent>
    </Card>
  );
}

/** 指定件数のカードスケルトンをグリッドで並べる。 */
export function CourseCardSkeletonGrid({
  count = 4,
  columns = true,
}: {
  count?: number;
  columns?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={columns ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}
