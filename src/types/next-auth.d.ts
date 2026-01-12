import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: 'admin' | 'operator' | 'viewer';
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name: string;
    image?: string;
    role: 'admin' | 'operator' | 'viewer';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'admin' | 'operator' | 'viewer';
  }
}
