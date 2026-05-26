'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { signInWithCredentials } from '@/features/auth/actions/signin';
import { signUp } from '@/features/auth/actions/signup';
import { SignUpSchema, type SignUpInput } from '@/features/auth/schemas/credentials';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INPUT: 'Please review the highlighted fields.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  INVALID_CREDENTIALS: 'Account created but auto sign-in failed. Please sign in manually.',
};

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: '', name: '', password: '' },
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const signUpResult = await signUp(values);
      if (!signUpResult.ok) {
        toast.error(ERROR_MESSAGES[signUpResult.error] ?? 'Sign-up failed');
        return;
      }

      const signInResult = await signInWithCredentials({
        email: values.email,
        password: values.password,
      });
      if (!signInResult.ok) {
        toast.error(ERROR_MESSAGES[signInResult.error] ?? 'Auto sign-in failed');
        router.push('/sign-in');
        return;
      }

      toast.success('Welcome aboard');
      router.push('/');
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Ada Lovelace" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  );
}
