import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { Link, redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) redirect({ href: '/', locale });

  const t = await getTranslations('auth.signUp');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          {t('hasAccount')}{' '}
          <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
            {t('signInLink')}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
