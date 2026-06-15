import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { upsertUserProfile, normalizeEmail } from '@/lib/users-repo';

function getProfileString(profile: Record<string, unknown>, key: string) {
  const value = profile[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: false
    })
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile) return false;

      const googleProfile = profile as Record<string, unknown>;
      const email = getProfileString(googleProfile, 'email');
      const googleSubject = getProfileString(googleProfile, 'sub');
      const isVerifiedEmail = googleProfile.email_verified === true;

      if (!email || !googleSubject) return false;

      const now = new Date().toISOString();
      await upsertUserProfile({
        userId: `google:${googleSubject}`,
        email,
        emailNormalized: normalizeEmail(email),
        name: getProfileString(googleProfile, 'name'),
        image: getProfileString(googleProfile, 'picture'),
        googleSubject,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      });

      return isVerifiedEmail || Boolean(email);
    },
    async jwt({ token, profile }) {
      if (profile?.sub) token.sub = `google:${profile.sub}`;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    }
  }
});
