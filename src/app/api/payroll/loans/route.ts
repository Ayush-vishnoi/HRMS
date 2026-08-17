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
    const viewAll = url.searchParams.get('view') === 'all' && (user.userRole === 'admin' || user.userRole === 'manager');

    const whereClause = viewAll
      ? {}
      : { employeeId: employeeId && user.userRole === 'admin' ? employeeId : user.id };

    const loans = await db.employeeLoanAdvance.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: loans });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching loans:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireEmployee();
    if (adminUser.userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can disburse loans and salary advances.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employeeId,
      loanType = 'SalaryAdvance',
      principalAmount,
      interestRate = 0,
      monthlyEmi,
      totalInstallments,
      disbursedOn = new Date().toISOString().split('T')[0],
      notes = '',
    } = body;

    if (!employeeId || !principalAmount || !monthlyEmi || !totalInstallments) {
      return NextResponse.json({ success: false, error: 'Missing required loan parameters.' }, { status: 400 });
    }

    const loan = await db.employeeLoanAdvance.create({
      data: {
        id: `loan-${Date.now().toString(36)}`,
        employeeId,
        loanType,
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate),
        monthlyEmi: Number(monthlyEmi),
        totalInstallments: Number(totalInstallments),
        paidInstallments: 0,
        remainingBalance: Number(principalAmount),
        status: 'Active',
        disbursedOn,
        approvedById: adminUser.id,
        notes,
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'CREATE_LOAN',
        module: 'Payroll',
        employeeId,
        details: JSON.stringify({ loanId: loan.id, principalAmount, monthlyEmi, totalInstallments }),
      },
    });

    // Notify employee
    await db.userNotification.create({
      data: {
        id: `notif-loan-${Date.now()}`,
        userId: employeeId,
        title: `${loanType} Disbursed`,
        message: `A ${loanType} of ₹${Number(principalAmount).toLocaleString('en-IN')} has been approved with monthly EMI of ₹${Number(monthlyEmi).toLocaleString('en-IN')}.`,
        type: 'System',
        linkUrl: '/payroll',
      },
    });

    return NextResponse.json({ success: true, data: loan }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to create loan' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireEmployee();
    if (adminUser.userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can modify loans.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, monthlyEmi, remainingBalance, pauseMonth, resumeMonth, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Loan ID is required.' }, { status: 400 });
    }

    const existing = await db.employeeLoanAdvance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Loan not found.' }, { status: 404 });
    }

    let pausedMonths = [...existing.pausedMonths];
    if (pauseMonth && !pausedMonths.includes(pauseMonth)) {
      pausedMonths.push(pauseMonth);
    }
    if (resumeMonth) {
      pausedMonths = pausedMonths.filter((m) => m !== resumeMonth);
    }

    const updated = await db.employeeLoanAdvance.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(typeof monthlyEmi === 'number' ? { monthlyEmi } : {}),
        ...(typeof remainingBalance === 'number' ? { remainingBalance } : {}),
        pausedMonths,
        ...(notes ? { notes } : {}),
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'UPDATE_LOAN',
        module: 'Payroll',
        employeeId: existing.employeeId,
        details: JSON.stringify({ id, status, monthlyEmi, remainingBalance, pausedMonths }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating loan:', error);
    return NextResponse.json({ success: false, error: 'Failed to update loan' }, { status: 500 });
  }
}
