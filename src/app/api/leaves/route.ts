import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  AuthorizationError,
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const requestedEmployeeId = new URL(request.url).searchParams.get('employeeId');
    const where =
      employee.userRole === 'admin'
        ? requestedEmployeeId
          ? { employeeId: requestedEmployeeId }
          : undefined
        : employee.userRole === 'manager'
          ? requestedEmployeeId
            ? {
                employeeId: requestedEmployeeId,
                OR: [
                  { employeeId: employee.id },
                  { employee: { managerId: employee.id } },
                ],
              }
            : { OR: [{ employeeId: employee.id }, { employee: { managerId: employee.id } }] }
          : { employeeId: employee.id };

    if (requestedEmployeeId) {
      await requireEmployeeAccess(requestedEmployeeId);
    }

    const balanceEmployeeId = requestedEmployeeId || employee.id;

    const [requests, balances] = await Promise.all([
      db.leaveRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { name: true, employeeCode: true, avatarUrl: true, department: true },
          },
        },
      }),
      db.leaveBalance.findMany({
        where: { employeeId: balanceEmployeeId },
      }),
    ]);

    return NextResponse.json({ success: true, data: { requests, balances } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching leave requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();
    const newRequest = await db.leaveRequest.create({
      data: {
        id: `LR-${Date.now()}`,
        employeeId: employee.id,
        leaveType: body.leaveType,
        startDate: body.startDate,
        endDate: body.endDate,
        days: Number(body.days),
        reason: body.reason,
        status: 'Pending',
        appliedOn: new Date().toISOString().split('T')[0],
      },
    });

    return NextResponse.json({ success: true, data: newRequest });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const reviewer = await requireRole('manager', 'admin');
    const body = await request.json();
    const { id, status } = body;
    const requestToReview = await db.leaveRequest.findUnique({
      where: { id },
      select: { employeeId: true, employee: { select: { managerId: true } } },
    });

    if (!requestToReview) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 },
      );
    }

    if (
      reviewer.userRole === 'manager' &&
      requestToReview.employee.managerId !== reviewer.id
    ) {
      throw new AuthorizationError();
    }

    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerId: reviewer.id,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating leave status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update leave status' }, { status: 500 });
  }
}
