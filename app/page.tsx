import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">E-learning OSS</h1>
        <p className="text-muted-foreground">
          An open-source platform for online courses, quizzes, and learner progress tracking.
        </p>

        {user ? (
          <div className="flex flex-col items-center gap-3">
            <p>
              Signed in as <span className="font-medium">{user.name}</span>{' '}
              <span className="text-muted-foreground">({user.role.toLowerCase()})</span>
            </p>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
