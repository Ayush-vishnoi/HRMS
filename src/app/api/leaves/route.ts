import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    const [requests, balances] = await Promise.all([
      db.leaveRequest.findMany({
        where: employeeId ? { employeeId } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { name: true, employeeCode: true, avatarUrl: true, department: true },
          },
        },
      }),
      employeeId
        ? db.leaveBalance.findMany({
            where: { employeeId },
          })
        : [],
    ]);

    return NextResponse.json({ success: true, data: { requests, balances } });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newRequest = await db.leaveRequest.create({
      data: {
        id: `LR-${Date.now()}`,
        employeeId: body.employeeId,
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
    console.error('Error creating leave request:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, reviewerId } = body;

    const updated = await db.leaveRequest.update({
      where: { id },
      data: {
        status,
        reviewerId: reviewerId || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating leave status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update leave status' }, { status: 500 });
  }
}
