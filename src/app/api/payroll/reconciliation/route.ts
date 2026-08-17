import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { runPayrollCycleReconciliation } from '@/lib/payroll/reconciliation-engine';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');

    if (!cycleId) {
      const records = await db.payrollReconciliationRecord.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ success: true, data: records });
    }

    const record = await db.payrollReconciliationRecord.findUnique({
      where: { cycleId },
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching reconciliation record:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch reconciliation record' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    if (user.userRole !== 'admin' && user.userRole !== 'manager') {
      return NextResponse.json({ success: false, error: 'Unauthorized to run reconciliation.' }, { status: 403 });
    }

    const body = await request.json();
    const { cycleId } = body;

    if (!cycleId) {
      return NextResponse.json({ success: false, error: 'Cycle ID is required.' }, { status: 400 });
    }

    const cycle = await db.payrollCycle.findUnique({
      where: { id: cycleId },
      include: { items: true },
    });

    if (!cycle) {
      return NextResponse.json({ success: false, error: 'Payroll cycle not found.' }, { status: 404 });
    }

    // Fetch corresponding payslips for this monthYear
    const payslips = await db.payslip.findMany({
      where: { monthYear: cycle.monthYear },
      select: { employeeId: true, netPayable: true },
    });

    const formattedPayslips = payslips.map((p) => ({
      employeeId: p.employeeId,
      netPayable: Number(p.netPayable),
    }));

    const reconciliation = runPayrollCycleReconciliation({
      cycle: {
        id: cycle.id,
        monthYear: cycle.monthYear,
        totalEmployees: cycle.totalEmployees,
        totalGross: cycle.totalGross,
        totalDeductions: cycle.totalDeductions,
        totalNetPayable: cycle.totalNetPayable,
      },
      items: cycle.items,
      payslips: formattedPayslips,
      totalDisbursedAmount: cycle.status === 'Disbursed' ? cycle.totalNetPayable : undefined,
    });

    // Upsert reconciliation record
    const saved = await db.payrollReconciliationRecord.upsert({
      where: { cycleId },
      update: {
        status: reconciliation.status,
        totalEmployees: reconciliation.totalEmployees,
        totalGross: reconciliation.totalGross,
        totalDeductions: reconciliation.totalDeductions,
        totalNet: reconciliation.totalNet,
        totalDisbursed: reconciliation.totalDisbursed,
        discrepanciesCount: reconciliation.discrepanciesCount,
        anomaliesJson: JSON.stringify(reconciliation.anomalies),
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
      create: {
        id: `recon-${Date.now().toString(36)}`,
        cycleId,
        monthYear: cycle.monthYear,
        status: reconciliation.status,
        totalEmployees: reconciliation.totalEmployees,
        totalGross: reconciliation.totalGross,
        totalDeductions: reconciliation.totalDeductions,
        totalNet: reconciliation.totalNet,
        totalDisbursed: reconciliation.totalDisbursed,
        discrepanciesCount: reconciliation.discrepanciesCount,
        anomaliesJson: JSON.stringify(reconciliation.anomalies),
        verifiedById: user.id,
        verifiedAt: new Date(),
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'RUN_PAYROLL_RECONCILIATION',
        module: 'Payroll',
        employeeId: user.id,
        details: JSON.stringify({ cycleId, status: reconciliation.status, discrepancies: reconciliation.discrepanciesCount }),
      },
    });

    return NextResponse.json({ success: true, data: { ...saved, anomalies: reconciliation.anomalies } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error running payroll reconciliation:', error);
    return NextResponse.json({ success: false, error: 'Failed to run payroll reconciliation' }, { status: 500 });
  }
}
