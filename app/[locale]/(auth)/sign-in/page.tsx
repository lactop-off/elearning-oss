import { getTranslations, setRequestLocale } from 'next-intl/server';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { Link, redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) redirect({ href: '/', locale });

  const t = await getTranslations('auth.signIn');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          {t('noAccount')}{' '}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
            {t('createOne')}
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
