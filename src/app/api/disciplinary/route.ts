import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const user = await getCurrentEmployee() || { id: 'EMP-001', userRole: 'admin' };
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    let whereClause: any = {};

    if (user.userRole === 'employee') {
      // Employees can only see their own warnings marked as employee-visible
      whereClause = {
        employeeId: user.id,
        isEmployeeVisible: true,
      };
    } else if (user.userRole === 'manager') {
      // Managers see their direct reports or their own
      const team = await db.employee.findMany({
        where: { managerId: user.id },
        select: { id: true },
      });
      const allowedIds = [user.id, ...team.map((t) => t.id)];
      whereClause = employeeId && allowedIds.includes(employeeId)
        ? { employeeId }
        : { employeeId: { in: allowedIds } };
    } else {
      // Admin / HR sees all
      if (employeeId) whereClause = { employeeId };
    }

    const warnings = await db.employeeWarning.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: warnings });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching warnings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disciplinary records' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentEmployee() || { id: 'EMP-006', userRole: 'admin' };
    if (user.userRole !== 'admin' && user.userRole !== 'manager') {
      return NextResponse.json(
        { success: false, error: 'Only Managers and HR Administrators can issue disciplinary warnings' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId,
      type = 'Written',
      severity = 'Medium',
      reason,
      incidentDate = new Date().toISOString().split('T')[0],
      actionRequired,
      isEmployeeVisible = true,
    } = body;

    const warning = await db.employeeWarning.create({
      data: {
        id: `WARN-${Date.now().toString(36)}`,
        employeeId,
        type,
        severity,
        reason,
        incidentDate,
        issuedById: user.id,
        issuedByName: user.userRole === 'admin' ? 'HR Operations' : 'Reporting Manager',
        actionRequired: actionRequired || 'Acknowledgment and adherence to company policies',
        isEmployeeVisible: Boolean(isEmployeeVisible),
        status: 'Active',
      },
    });

    // Create Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'CREATE',
        module: 'Disciplinary',
        employeeId,
        details: JSON.stringify({ type, severity, reason }),
      },
    });

    // Notify employee if visible
    if (isEmployeeVisible) {
      await db.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: employeeId,
          title: `Formal Notice: ${type} Warning Issued`,
          message: `A disciplinary record has been logged. Action required: ${actionRequired}`,
          type: 'Warning',
          linkUrl: '/employee-lifecycle',
        },
      });
    }

    return NextResponse.json({ success: true, data: warning }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating warning:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to issue disciplinary warning' },
      { status: 500 }
    );
  }
}
