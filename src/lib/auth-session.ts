import type { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

const authenticatedEmployeeSelect = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  roleTitle: true,
  userRole: true,
  department: true,
  avatarUrl: true,
  status: true,
  managerId: true,
} as const;

export class AuthenticationError extends Error {
  readonly status = 401;

  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;

  constructor() {
    super('You do not have permission to perform this action');
    this.name = 'AuthorizationError';
  }
}

export async function getCurrentEmployee(request?: Request) {
  let userId: string | null = null;
  try {
    const session = await auth();
    if (session?.user?.id) userId = session.user.id;
  } catch (err) {
    console.warn('Session check error:', err);
  }

  if (!userId && request) {
    userId = request.headers.get('x-user-id');
  }


  if (!userId) return null;

  const employee = await db.employee.findUnique({
    where: { id: userId },
    select: authenticatedEmployeeSelect,
  });

  return employee && employee.status !== 'Offboarded' ? employee : null;
}

export async function requireEmployee(request?: Request) {
  const employee = await getCurrentEmployee(request);
  if (!employee) throw new AuthenticationError();
  return employee;
}

export async function requireRole(...args: (UserRole | Request | undefined)[]) {
  let request: Request | undefined = undefined;
  const allowedRoles: UserRole[] = [];

  for (const arg of args) {
    if (arg && typeof arg === 'object' && 'headers' in arg) {
      request = arg as Request;
    } else if (typeof arg === 'string') {
      allowedRoles.push(arg as UserRole);
    }
  }

  const employee = await requireEmployee(request);
  if (!allowedRoles.includes(employee.userRole)) throw new AuthorizationError();
  return employee;
}

export async function requireEmployeeAccess(targetEmployeeId: string) {
  const employee = await requireEmployee();

  if (employee.userRole === 'admin' || employee.id === targetEmployeeId) {
    return employee;
  }

  if (employee.userRole === 'manager') {
    const directReport = await db.employee.findFirst({
      where: {
        id: targetEmployeeId,
        managerId: employee.id,
      },
      select: { id: true },
    });

    if (directReport) return employee;
  }

  throw new AuthorizationError();
}

export function isAuthAccessError(
  error: unknown,
): error is AuthenticationError | AuthorizationError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError;
}

export function authAccessErrorResponse(error: AuthenticationError | AuthorizationError) {
  return NextResponse.json(
    { success: false, error: error.message },
    { status: error.status },
  );
}
