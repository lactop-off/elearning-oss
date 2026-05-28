'use client';

import { BookOpen, GraduationCap, LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  Icon: typeof BookOpen;
};

export function MainNav({
  isAuthenticated,
  canManageCourses,
}: {
  isAuthenticated: boolean;
  canManageCourses: boolean;
}) {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: '/courses', label: t('catalog'), Icon: BookOpen },
    ...(isAuthenticated
      ? [{ href: '/learn', label: t('myLearning'), Icon: GraduationCap }]
      : []),
    ...(canManageCourses
      ? [{ href: '/instructor/courses', label: t('myCourses'), Icon: LayoutDashboard }]
      : []),
  ];

  return (
    <ul className="flex items-center gap-1">
      {items.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-accent text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
