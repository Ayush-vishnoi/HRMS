import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'my';
    const employeeId = url.searchParams.get('employeeId');
    const role = url.searchParams.get('role') || 'employee';

    const whereClause = (view === 'all' && (role === 'admin' || role === 'manager'))
      ? {}
      : (employeeId ? { employeeId } : {});

    const claims = await db.expenseClaim.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: claims });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching expense claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense claims' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      title,
      category = 'Travel',
      amount,
      currency = 'INR',
      expenseDate,
      merchantName,
      receiptUrl,
      description,
    } = body;

    if (!employeeId || !title || !amount || !expenseDate || !merchantName) {
      return NextResponse.json(
        { success: false, error: 'Missing required expense fields.' },
        { status: 400 }
      );
    }

    const count = await db.expenseClaim.count();
    const claimNumber = `EXP-2026-${String(count + 1).padStart(3, '0')}`;

    const newClaim = await db.expenseClaim.create({
      data: {
        id: `EXP-${Date.now().toString(36)}`,
        claimNumber,
        employeeId,
        title,
        category,
        amount: Number(amount),
        currency,
        expenseDate,
        merchantName,
        receiptUrl: receiptUrl || null,
        description: description || '',
        managerStatus: 'Pending',
        financeStatus: 'Pending',
        paymentStatus: 'Pending',
      },
    });

    return NextResponse.json({ success: true, data: newClaim }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating expense claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense claim' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, managerStatus, financeStatus, paymentStatus, approvedAmount } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Claim ID is required.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (managerStatus) updateData.managerStatus = managerStatus;
    if (financeStatus) updateData.financeStatus = financeStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (typeof approvedAmount === 'number') updateData.approvedAmount = approvedAmount;
    if (paymentStatus === 'SettledInPayroll' || paymentStatus === 'DirectBankTransferred') {
      updateData.settlementDate = new Date().toISOString().split('T')[0];
    }

    const updated = await db.expenseClaim.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating expense claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense claim' },
      { status: 500 }
    );
  }
}
