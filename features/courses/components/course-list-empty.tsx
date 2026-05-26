import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export async function CourseListEmpty() {
  const t = await getTranslations('courses.list.empty');
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center"
    >
      <p className="text-muted-foreground">{t('message')}</p>
      <Button asChild>
        <Link href="/instructor/courses/new">{t('cta')}</Link>
      </Button>
    </div>
  );
}
