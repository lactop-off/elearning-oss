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
import { signUp } from '@/features/auth/actions/signup';
import { SignUpSchema, type SignUpInput } from '@/features/auth/schemas/credentials';
import { useRouter } from '@/i18n/navigation';

const KNOWN_SIGN_UP_CODES = ['INVALID_INPUT', 'EMAIL_TAKEN', 'INTERNAL_ERROR'] as const;
type KnownSignUpCode = (typeof KNOWN_SIGN_UP_CODES)[number];

function isKnownSignUpCode(code: string): code is KnownSignUpCode {
  return (KNOWN_SIGN_UP_CODES as readonly string[]).includes(code);
}

export function SignUpForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('auth.signUp');
  const tToast = useTranslations('auth.toast');
  const tError = useTranslations('auth.errors');

  const form = useForm<SignUpInput>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: '', name: '', password: '' },
  });

  function onSubmit(values: SignUpInput) {
    startTransition(async () => {
      const signUpResult = await signUp(values);
      if (!signUpResult.ok) {
        const message = isKnownSignUpCode(signUpResult.error)
          ? tError(signUpResult.error)
          : tError('GENERIC_SIGN_UP_FAILED');
        toast.error(message);
        return;
      }

      const signInResult = await signInWithCredentials({
        email: values.email,
        password: values.password,
      });
      if (!signInResult.ok) {
        toast.error(tError('AUTO_SIGN_IN_FAILED'));
        router.push('/sign-in');
        return;
      }

      toast.success(tToast('welcome'));
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
              <FormLabel>{t('nameLabel')}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder={t('namePlaceholder')}
                  {...field}
                />
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
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('passwordPlaceholder')}
                  {...field}
                />
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
