import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { authConfig } from './auth.config';
import { findUserByEmail } from '@/features/auth/data/users';
import { SignInSchema } from '@/features/auth/schemas/credentials';
import { verifyPassword } from '@/lib/password';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = SignInSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await findUserByEmail(parsed.data.email);
        if (!user || !user.passwordHash) return null;

        // 無効化済みアカウントはサインイン不可。
        // 既存の JWT セッションはトークン期限まで有効（毎リクエストでの DB 検証はパフォーマンス上行わない）。
        if (user.disabledAt !== null) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image ?? null,
        };
      },
    }),
  ],
});
