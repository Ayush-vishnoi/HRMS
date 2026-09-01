import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { notifyAdmins, notifyUser } from '@/lib/notifications/notify';

const MANAGER_STATUSES = new Set(['Approved', 'Rejected']);
const HR_STATUSES = new Set(['Approved', 'Rejected']);
const PAYMENT_STATUSES = new Set(['SettledInPayroll', 'DirectBankTransferred']);

type ClaimEmployee = {
  id: string;
  name: string;
  managerId: string | null;
  userRole: string;
};

async function loadClaimEmployees(
  employeeIds: string[],
): Promise<Map<string, ClaimEmployee>> {
  const uniqueIds = [...new Set(employeeIds)];
  if (uniqueIds.length === 0) return new Map();

  const employees = await db.employee.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, name: true, managerId: true, userRole: true },
  });

  return new Map(employees.map((employee) => [employee.id, employee]));
}

/**
 * Attach the claim owner's name, manager id, and role so the UI can gate
 * the level-1 (manager) approval to the right person and render the skipped
 * manager level on a manager's own claims.
 */
function withEmployeeInfo<T extends { employeeId: string }>(
  claim: T,
  owner?: ClaimEmployee,
) {
  return {
    ...claim,
    employeeName: owner?.name ?? null,
    employeeManagerId: owner?.managerId ?? null,
    employeeRole: owner?.userRole ?? null,
  };
}

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'my';

    const isHRAdmin = employee.userRole === 'admin';
    const isManager = employee.userRole === 'manager';

    let claims;
    if (view === 'all' && isHRAdmin) {
      // HR admins see every claim in the company.
      claims = await db.expenseClaim.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } else if (view === 'all' && isManager) {
      // Managers see the claims filed by their direct reports — the claims
      // that are waiting on their first-level approval — plus their own
      // claims, which skip the manager level and wait on HR directly.
      const reports = await db.employee.findMany({
        where: { managerId: employee.id },
        select: { id: true },
      });
      claims = await db.expenseClaim.findMany({
        where: {
          OR: [
            { employeeId: employee.id },
            { employeeId: { in: reports.map((report) => report.id) } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Everyone else only sees their own claims.
      claims = await db.expenseClaim.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
      });
    }

    const employeeMap = await loadClaimEmployees(
      claims.map((claim) => claim.employeeId),
    );
    const data = claims.map((claim) =>
      withEmployeeInfo(claim, employeeMap.get(claim.employeeId)),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching expense claims:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expense claims' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();
    const {
      title,
      category = 'Travel',
      amount,
      currency = 'INR',
      expenseDate,
      merchantName,
      receiptUrl,
      description,
    } = body;

    if (!title || !amount || !expenseDate || !merchantName) {
      return NextResponse.json(
        { success: false, error: 'Missing required expense fields.' },
        { status: 400 },
      );
    }

    // Derive the next claim number from the highest existing sequence, not
    // the row count — deletions would otherwise cause unique-key collisions.
    const latest = await db.expenseClaim.findFirst({
      orderBy: { claimNumber: 'desc' },
      select: { claimNumber: true },
    });
    const latestSeq = latest ? parseInt(latest.claimNumber.split('-').pop() ?? '0', 10) : 0;
    const claimNumber = `EXP-2026-${String((isNaN(latestSeq) ? 0 : latestSeq) + 1).padStart(3, '0')}`;

    // A manager cannot approve their own claim, so the manager level is
    // skipped entirely for claims filed by managers — they go straight to
    // HR admin approval.
    const filerIsManager = employee.userRole === 'manager';

    const newClaim = await db.expenseClaim.create({
      data: {
        id: `EXP-${Date.now().toString(36)}`,
        claimNumber,
        // Claims are always filed for the signed-in employee.
        employeeId: employee.id,
        title,
        category,
        amount: Number(amount),
        currency,
        expenseDate,
        merchantName,
        receiptUrl: receiptUrl || null,
        description: description || '',
        managerStatus: filerIsManager ? 'Approved' : 'Pending',
        financeStatus: 'Pending',
        paymentStatus: 'Pending',
      },
    });

    const amountText = `${currency} ${Number(amount).toLocaleString('en-IN')}`;

    // Two-step approval: the reporting manager acts first, then an HR admin.
    // A manager's own claim skips the manager step and waits on HR directly.
    if (filerIsManager) {
      await notifyAdmins({
        title: 'New Expense Claim',
        message: `Manager ${employee.name} submitted expense claim ${claimNumber} "${title}" of ${amountText}. The manager level is skipped for a manager's own claim — HR admin approval is required.`,
        type: 'Expense',
        linkUrl: '/expenses',
      });
    } else if (employee.managerId) {
      await notifyUser({
        userId: employee.managerId,
        title: 'New Expense Claim',
        message: `${employee.name} submitted expense claim ${claimNumber} "${title}" of ${amountText} for your approval.`,
        type: 'Expense',
        linkUrl: '/expenses',
      });
    } else {
      await notifyAdmins({
        title: 'New Expense Claim',
        message: `New expense claim ${claimNumber} "${title}" of ${amountText} submitted for approval.`,
        type: 'Expense',
        linkUrl: '/expenses',
      });
    }

    return NextResponse.json(
      { success: true, data: newClaim },
      { status: 201 },
    );
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating expense claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create expense claim' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();
    const { id, managerStatus, financeStatus, paymentStatus, approvedAmount, rejectionReason, resubmit } =
      body;
    const trimmedRejectionReason =
      typeof rejectionReason === 'string' ? rejectionReason.trim() : '';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Claim ID is required.' },
        { status: 400 },
      );
    }

    const existing = await db.expenseClaim.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Claim not found.' },
        { status: 404 },
      );
    }

    const claimOwner = await db.employee.findUnique({
      where: { id: existing.employeeId },
      select: { id: true, name: true, managerId: true, userRole: true },
    });
    if (!claimOwner) {
      return NextResponse.json(
        { success: false, error: 'Claim employee not found.' },
        { status: 404 },
      );
    }

    const isHRAdmin = employee.userRole === 'admin';
    const isClaimManager = employee.id === claimOwner.managerId;
    const wantsManagerAction = managerStatus !== undefined;
    const wantsHrAction = financeStatus !== undefined;
    const wantsPaymentAction = paymentStatus !== undefined;
    const wantsResubmit = resubmit === true;

    // Resubmit is a standalone action — it resets the whole approval cycle
    // and cannot be mixed with approval or settlement updates.
    if (wantsResubmit && (wantsManagerAction || wantsHrAction || wantsPaymentAction)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resubmit cannot be combined with approval or settlement actions.',
        },
        { status: 400 },
      );
    }

    // Level 1 — reporting manager approval only. An HR admin may step in
    // solely when the claim owner has no reporting manager assigned; with a
    // manager in place, HR admin decisions always land on the HR (level-2)
    // field and never touch the manager field.
    const managerFallback = isHRAdmin && !claimOwner.managerId;
    if (wantsManagerAction) {
      if (!isClaimManager && !managerFallback) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Only the claim owner's reporting manager can perform the manager approval.",
          },
          { status: 403 },
        );
      }
      if (existing.managerStatus !== 'Pending') {
        return NextResponse.json(
          {
            success: false,
            error: 'The manager decision for this claim has already been recorded.',
          },
          { status: 400 },
        );
      }
      if (!MANAGER_STATUSES.has(managerStatus)) {
        return NextResponse.json(
          { success: false, error: 'Manager status must be Approved or Rejected.' },
          { status: 400 },
        );
      }
      if (managerStatus === 'Rejected' && !trimmedRejectionReason) {
        return NextResponse.json(
          { success: false, error: 'A rejection reason is required when rejecting a claim.' },
          { status: 400 },
        );
      }
    }

    // Level 2 — HR admin approval, only after the manager has approved.
    if (wantsHrAction) {
      if (!isHRAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only an HR admin can perform the HR approval.' },
          { status: 403 },
        );
      }
      if (existing.managerStatus !== 'Approved') {
        return NextResponse.json(
          {
            success: false,
            error:
              existing.managerStatus === 'Rejected'
                ? 'This claim was rejected by the manager.'
                : 'Manager approval is required before HR admin approval.',
          },
          { status: 400 },
        );
      }
      if (existing.financeStatus !== 'Pending') {
        return NextResponse.json(
          {
            success: false,
            error: 'The HR admin decision for this claim has already been recorded.',
          },
          { status: 400 },
        );
      }
      if (!HR_STATUSES.has(financeStatus)) {
        return NextResponse.json(
          { success: false, error: 'HR status must be Approved or Rejected.' },
          { status: 400 },
        );
      }
      if (financeStatus === 'Rejected' && !trimmedRejectionReason) {
        return NextResponse.json(
          { success: false, error: 'A rejection reason is required when rejecting a claim.' },
          { status: 400 },
        );
      }
    }

    // Settlement — HR admin only, after both approvals.
    if (wantsPaymentAction) {
      if (!isHRAdmin) {
        return NextResponse.json(
          { success: false, error: 'Only an HR admin can settle claims.' },
          { status: 403 },
        );
      }
      if (
        existing.managerStatus !== 'Approved' ||
        existing.financeStatus !== 'Approved'
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Both manager and HR admin approvals are required before settlement.',
          },
          { status: 400 },
        );
      }
      if (existing.paymentStatus !== 'Pending') {
        return NextResponse.json(
          { success: false, error: 'This claim has already been settled.' },
          { status: 400 },
        );
      }
      if (!PAYMENT_STATUSES.has(paymentStatus)) {
        return NextResponse.json(
          { success: false, error: 'Invalid payment status.' },
          { status: 400 },
        );
      }
    }

    // Resubmit — the claim owner re-opens their rejected claim for a fresh
    // two-level approval cycle. Rejection reasons, any approved amount, and
    // settlement data are cleared so the claim starts clean.
    if (wantsResubmit) {
      if (employee.id !== existing.employeeId) {
        return NextResponse.json(
          { success: false, error: 'Only the claim owner can resubmit this claim.' },
          { status: 403 },
        );
      }
      if (existing.managerStatus !== 'Rejected' && existing.financeStatus !== 'Rejected') {
        return NextResponse.json(
          { success: false, error: 'Only rejected claims can be resubmitted.' },
          { status: 400 },
        );
      }
    }

    if (
      !wantsManagerAction &&
      !wantsHrAction &&
      !wantsPaymentAction &&
      !wantsResubmit &&
      approvedAmount === undefined
    ) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update.' },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (wantsManagerAction) {
      updateData.managerStatus = managerStatus;
      if (managerStatus === 'Rejected') {
        updateData.managerRejectionReason = trimmedRejectionReason;
      }
    }
    if (wantsHrAction) {
      updateData.financeStatus = financeStatus;
      updateData.approvedAmount =
        typeof approvedAmount === 'number' ? approvedAmount : existing.amount;
      if (financeStatus === 'Rejected') {
        updateData.hrRejectionReason = trimmedRejectionReason;
      }
    }
    if (!wantsHrAction && typeof approvedAmount === 'number') {
      updateData.approvedAmount = approvedAmount;
    }
    if (wantsPaymentAction) {
      updateData.paymentStatus = paymentStatus;
      updateData.settlementDate = new Date().toISOString().split('T')[0];
    }
    if (wantsResubmit) {
      // A manager's own claim re-enters the cycle with the manager level
      // skipped again — it goes straight back to HR admin review.
      updateData.managerStatus =
        claimOwner.userRole === 'manager' ? 'Approved' : 'Pending';
      updateData.financeStatus = 'Pending';
      updateData.paymentStatus = 'Pending';
      updateData.managerRejectionReason = null;
      updateData.hrRejectionReason = null;
      updateData.approvedAmount = null;
      updateData.settlementDate = null;
    }

    const updated = await db.expenseClaim.update({
      where: { id },
      data: updateData,
    });

    // Notify the claim owner about the decision, and hand the claim off to
    // the next approver in the chain.
    if (wantsManagerAction) {
      await notifyUser({
        userId: updated.employeeId,
        title: 'Expense Claim Update',
        message: `Your claim ${updated.claimNumber} "${updated.title}" — Manager: ${managerStatus}.${
          managerStatus === 'Rejected' && updated.managerRejectionReason
            ? ` Reason: ${updated.managerRejectionReason}`
            : ''
        }`,
        type: 'Expense',
        linkUrl: '/expenses',
      });

      if (managerStatus === 'Approved') {
        await notifyAdmins({
          title: 'Expense Claim Pending HR Approval',
          message: `Manager ${employee.name} approved claim ${updated.claimNumber} "${updated.title}" by ${claimOwner.name}. HR admin approval is now required.`,
          type: 'Expense',
          linkUrl: '/expenses',
        });
      }
    }

    if (wantsHrAction) {
      await notifyUser({
        userId: updated.employeeId,
        title: 'Expense Claim Update',
        message: `Your claim ${updated.claimNumber} "${updated.title}" — HR Admin: ${financeStatus}.${
          financeStatus === 'Rejected' && updated.hrRejectionReason
            ? ` Reason: ${updated.hrRejectionReason}`
            : ''
        }`,
        type: 'Expense',
        linkUrl: '/expenses',
      });
    }

    if (wantsPaymentAction) {
      await notifyUser({
        userId: updated.employeeId,
        title: 'Expense Claim Settled',
        message: `Your claim ${updated.claimNumber} "${updated.title}" — ${
          paymentStatus === 'SettledInPayroll'
            ? 'settled in payroll'
            : 'transferred directly to your bank'
        }.`,
        type: 'Expense',
        linkUrl: '/expenses',
      });
    }

    if (wantsResubmit) {
      const resubmitMessage = `${claimOwner.name} resubmitted claim ${updated.claimNumber} "${updated.title}" for approval.`;
      // A manager's own claim skips the manager level, so it returns
      // straight to HR admin review instead of a reporting manager.
      if (claimOwner.userRole !== 'manager' && claimOwner.managerId) {
        await notifyUser({
          userId: claimOwner.managerId,
          title: 'Expense Claim Resubmitted',
          message: resubmitMessage,
          type: 'Expense',
          linkUrl: '/expenses',
        });
      } else {
        await notifyAdmins({
          title: 'Expense Claim Resubmitted',
          message: resubmitMessage,
          type: 'Expense',
          linkUrl: '/expenses',
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating expense claim:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense claim' },
      { status: 500 },
    );
  }
}
