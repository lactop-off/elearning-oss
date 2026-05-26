import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe Auth.js config.
 *
 * This is imported by middleware.ts and runs in the Edge runtime, so it must
 * NOT import Node-only modules (Prisma, bcryptjs, etc). Provider implementations
 * that need DB/crypto access belong in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const pathname = request.nextUrl.pathname;

      const isPublic =
        pathname === '/' ||
        pathname.startsWith('/sign-in') ||
        pathname.startsWith('/sign-up') ||
        pathname.startsWith('/api/auth');

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'LEARNER' | 'INSTRUCTOR' | 'ADMIN';
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
