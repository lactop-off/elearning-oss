import { GraduationCap, PenSquare, Shield } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/lib/generated/prisma/enums';

type RoleConfig = {
  variant: React.ComponentProps<typeof Badge>['variant'];
  Icon: typeof Shield;
};

const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  ADMIN: { variant: 'default', Icon: Shield },
  INSTRUCTOR: { variant: 'primarySoft', Icon: PenSquare },
  LEARNER: { variant: 'muted', Icon: GraduationCap },
};

export async function RoleBadge({ role }: { role: UserRole }) {
  const t = await getTranslations('roles');
  const { variant, Icon } = ROLE_CONFIG[role];

  return (
    <Badge variant={variant} className="capitalize">
      <Icon aria-hidden="true" />
      {t(role)}
    </Badge>
  );
}
