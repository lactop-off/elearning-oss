'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
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
import { SignInSchema, type SignInInput } from '@/features/auth/schemas/credentials';
import { useRouter } from '@/i18n/navigation';

const KNOWN_ERROR_CODES = [
  'INVALID_INPUT',
  'INVALID_CREDENTIALS',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

function isKnownErrorCode(code: string): code is KnownErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code);
}

export function SignInForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.signIn');
  const tToast = useTranslations('auth.toast');
  const tError = useTranslations('auth.errors');

  const form = useForm<SignInInput>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  function onSubmit(values: SignInInput) {
    startTransition(async () => {
      const result = await signInWithCredentials(values);
      if (result.ok) {
        toast.success(tToast('signedIn'));
        router.push('/');
        router.refresh();
        return;
      }
      const message = isKnownErrorCode(result.error)
        ? tError(result.error)
        : tError('GENERIC_SIGN_IN_FAILED');
      toast.error(message);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('emailPlaceholder')}
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
              <FormLabel>{t('passwordLabel')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? t('submitting') : t('submit')}
        </Button>
      </form>
    </Form>
  );
}
