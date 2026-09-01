import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';

/**
 * Returns the signed-in manager's direct reports (Employee.managerId
 * hierarchy). Admins receive every active employee instead, since admins
 * may assign tasks across the organisation.
 */
export async function GET(request: Request) {
  try {
    const employee = await requireRole('manager', 'admin', request);

    const reports = await db.employee.findMany({
      where: {
        status: { not: 'Offboarded' },
        ...(employee.userRole === 'admin' ? {} : { managerId: employee.id }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleTitle: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: reports });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching direct reports:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch direct reports' }, { status: 500 });
  }
}
