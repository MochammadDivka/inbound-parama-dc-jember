import { NextAuthOptions, User as NextAuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compareSecret } from '@/lib/bcrypt';
import { dsGetUserForAuth, dsGetAdminForAuth, dsAddLog } from '@/lib/data-source';
import { isLocked, recordFailedAttempt, clearAttempts, lockRemainingMinutes } from '@/lib/login-attempts';
import { UserRole } from '@/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string; // nama lengkap
      username?: string;
      email?: string;
      role: UserRole;
    };
  }
  interface User {
    id: string;
    name: string;
    username?: string;
    email?: string;
    role: UserRole;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    username?: string;
    role: UserRole;
    // name sudah ada di JWT default
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // ─── USER login: username + PIN ────────────────────────────────
    CredentialsProvider({
      id: 'user-credentials',
      name: 'User (PIN)',
      credentials: {
        username: { label: 'Username', type: 'text' },
        pin: { label: 'PIN', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.pin) return null;

        const username = credentials.username.toLowerCase().trim();

        // Check lockout
        if (isLocked(username)) {
          const mins = lockRemainingMinutes(username);
          throw new Error(`LOCKED:${mins}`);
        }

        // Lookup user + pin_hash dari data source (GAS atau mock)
        const authData = await dsGetUserForAuth(username);

        if (!authData || authData.user.status !== 'ACTIVE') {
          recordFailedAttempt(username);
          await dsAddLog({
            reference_id: username,
            reference_type: 'USER',
            action: 'login_failed',
            performed_by: username,
            notes: 'Login gagal: user tidak ditemukan atau tidak aktif',
          });
          return null;
        }

        // Verify PIN dengan bcrypt
        const isValid = await compareSecret(credentials.pin, authData.pin_hash);
        if (!isValid) {
          const nowLocked = recordFailedAttempt(username);
          await dsAddLog({
            reference_id: authData.user.user_id,
            reference_type: 'USER',
            action: 'login_failed',
            performed_by: authData.user.nama,
            notes: `Login gagal: PIN salah${nowLocked ? ' — akun terkunci' : ''}`,
          });
          return null;
        }

        // Success
        clearAttempts(username);
        await dsAddLog({
          reference_id: authData.user.user_id,
          reference_type: 'USER',
          action: 'login_success',
          performed_by: authData.user.nama,
          notes: 'Login berhasil',
        });

        return {
          id: authData.user.user_id,
          name: authData.user.nama, // nama lengkap untuk created_by
          username: authData.user.username,
          role: authData.user.role,
        } as NextAuthUser & { role: UserRole; username: string };
      },
    }),

    // ─── ADMIN login: email + password ─────────────────────────────
    CredentialsProvider({
      id: 'admin-credentials',
      name: 'Admin (Email)',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();

        // Check lockout by email
        if (isLocked(email)) {
          const mins = lockRemainingMinutes(email);
          throw new Error(`LOCKED:${mins}`);
        }

        // Lookup admin credential dari data source
        const authData = await dsGetAdminForAuth(email);

        if (!authData || authData.user.status !== 'ACTIVE') {
          recordFailedAttempt(email);
          await dsAddLog({
            reference_id: email,
            reference_type: 'USER',
            action: 'login_failed',
            performed_by: email,
            notes: 'Admin login gagal: email tidak ditemukan atau tidak aktif',
          });
          return null;
        }

        // Pastikan role ADMIN (sudah tidak ada SPV)
        if (authData.user.role !== 'ADMIN') {
          return null;
        }

        // Verify password dengan bcrypt
        const isValid = await compareSecret(credentials.password, authData.password_hash);
        if (!isValid) {
          recordFailedAttempt(email);
          await dsAddLog({
            reference_id: authData.user.user_id,
            reference_type: 'USER',
            action: 'login_failed',
            performed_by: authData.user.nama,
            notes: 'Admin login gagal: password salah',
          });
          return null;
        }

        clearAttempts(email);
        await dsAddLog({
          reference_id: authData.user.user_id,
          reference_type: 'USER',
          action: 'login_success',
          performed_by: authData.user.nama,
          notes: 'Admin login berhasil',
        });

        return {
          id: authData.user.user_id,
          name: authData.user.nama, // nama lengkap untuk created_by
          email: credentials.email,
          username: authData.user.username,
          role: authData.user.role,
        } as NextAuthUser & { role: UserRole; username: string };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name; // nama lengkap disimpan di JWT
        token.username = (user as NextAuthUser & { username?: string }).username;
        token.role = (user as NextAuthUser & { role: UserRole }).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name ?? '', // nama lengkap (untuk created_by, performed_by)
        username: token.username,
        email: token.email ?? undefined,
        role: token.role,
      };
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 jam = 1 shift kerja
  },

  secret: process.env.NEXTAUTH_SECRET,
};
