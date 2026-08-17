import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const monthYear = url.searchParams.get('monthYear');
    const viewAll = url.searchParams.get('view') === 'all' && (user.userRole === 'admin' || user.userRole === 'manager');

    const where: any = {};
    if (!viewAll) {
      where.employeeId = user.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
    }
    if (monthYear && monthYear !== 'All') {
      where.monthYear = monthYear;
    }

    const records = await db.variablePayRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching variable pay records:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch variable pay' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    if (user.userRole !== 'admin' && user.userRole !== 'manager') {
      return NextResponse.json({ success: false, error: 'Unauthorized to add variable pay.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employeeId,
      payType = 'PerformanceBonus',
      amount,
      monthYear,
      reason,
      isTaxable = true,
      status = 'Approved',
    } = body;

    if (!employeeId || !amount || !monthYear || !reason) {
      return NextResponse.json({ success: false, error: 'Missing required variable pay fields.' }, { status: 400 });
    }

    const record = await db.variablePayRecord.create({
      data: {
        id: `vp-${Date.now().toString(36)}`,
        employeeId,
        payType,
        amount: Number(amount),
        monthYear,
        reason,
        isTaxable: Boolean(isTaxable),
        status,
        approvedById: user.id,
        approvedAt: new Date(),
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: `CREATE_${payType.toUpperCase()}`,
        module: 'Payroll',
        employeeId,
        details: JSON.stringify({ payType, amount, monthYear, reason, approvedBy: user.id }),
      },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating variable pay:', error);
    return NextResponse.json({ success: false, error: 'Failed to create variable pay' }, { status: 500 });
  }
}
