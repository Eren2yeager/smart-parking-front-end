import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async signIn({ user, account }) {
      try {
        await connectDB();

        if (!user.email) {
          console.error('No email provided');
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
          console.log('Created new user:', user.email);
        } else {
          // Update existing user
          dbUser.lastLogin = new Date();
          dbUser.name = user.name || dbUser.name;
          dbUser.image = user.image || dbUser.image;
          await dbUser.save();
          console.log('Updated existing user:', user.email);
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      // Initial sign in - add user data to token
      if (user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email });
          
          if (dbUser) {
            token.id = dbUser._id.toString();
            token.role = dbUser.role;
            token.email = dbUser.email;
            token.name = dbUser.name;
            token.picture = dbUser.image;
            console.log('JWT token created for:', user.email);
          } else {
            console.error('User not found in DB after sign in:', user.email);
          }
        } catch (error) {
          console.error('Error in jwt callback (initial):', error);
        }
      }

      // Handle session updates
      if (trigger === 'update' && session) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: token.email });
          
          if (dbUser) {
            token.role = dbUser.role;
            token.name = dbUser.name;
            token.picture = dbUser.image;
          }
        } catch (error) {
          console.error('Error in jwt callback (update):', error);
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
