import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // Required for NextAuth v5 in production
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectDB();

        if (!user.email) {
          return false;
        }

        // Find or create user in database
        let dbUser = await User.findOne({ email: user.email });

        if (!dbUser) {
          // Create new user with default viewer role
          dbUser = await User.create({
            email: user.email,
            name: user.name || 'Unknown User',
            googleId: account?.providerAccountId || '',
            image: user.image,
            role: 'viewer', // Default role
            lastLogin: new Date(),
          });
        } else {
          // Update existing user
          dbUser.lastLogin = new Date();
          dbUser.name = user.name || dbUser.name;
          dbUser.image = user.image || dbUser.image;
          await dbUser.save();
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email });
        
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        await connectDB();
        const dbUser = await User.findOne({ email: token.email });
        
        if (dbUser) {
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'admin' | 'operator' | 'viewer';
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | undefined;
      }

      return session;
    },
  },
});

export const { GET, POST } = handlers;
