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
import { SignUpForm } from '@/features/auth/components/sign-up-form';
import { getCurrentUser } from '@/lib/auth';

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect('/');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start learning in less than a minute.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Already have an account?{' '}
          <Link href="/sign-in" className="underline underline-offset-4 hover:text-foreground">
            Sign in
          </Link>
        </span>
      </CardFooter>
    </Card>
  );
}
