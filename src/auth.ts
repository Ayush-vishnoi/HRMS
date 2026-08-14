import NextAuth from 'next-auth';
import { db } from '@/lib/db';
import { hrmsAuthAdapter } from '@/lib/auth-adapter';
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  AUTH_SESSION_UPDATE_AGE_SECONDS,
} from '@/lib/auth-cookies';

export const { handlers, auth } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: hrmsAuthAdapter,
  providers: [],
  session: {
    strategy: 'database',
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: AUTH_SESSION_UPDATE_AGE_SECONDS,
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async session({ session, user }) {
      const employee = await db.employee.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          email: true,
          roleTitle: true,
          userRole: true,
          department: true,
          avatarUrl: true,
          status: true,
        },
      });

      if (!employee) {
        return {
          expires: session.expires,
          user: session.user,
        };
      }

      return {
        expires: session.expires,
        user: {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          image: employee.avatarUrl,
          employeeCode: employee.employeeCode,
          role: employee.userRole,
          department: employee.department,
          status: employee.status,
        },
      };
    },
  },
});
