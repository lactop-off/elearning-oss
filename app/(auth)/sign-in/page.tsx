import Link from 'next/link';
import { redirect } from 'next/navigation';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SignInForm } from '@/features/auth/components/sign-in-form';
import { getCurrentUser } from '@/lib/auth';

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          No account yet?{' '}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-foreground">
            Create one
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
