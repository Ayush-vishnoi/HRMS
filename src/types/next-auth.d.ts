import type { DefaultSession } from 'next-auth';
import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      employeeCode: string;
      role: UserRole;
      department: string;
      status: string;
    } & DefaultSession['user'];
  }

  interface User {
    employeeCode?: string;
    role?: UserRole;
    department?: string;
    status?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    employeeCode?: string;
    role?: UserRole;
    department?: string;
    status?: string;
  }
}
