import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    if (employeeId) {
      const [structure, revisions] = await Promise.all([
        db.salaryStructure.findUnique({
          where: { employeeId },
        }),
        db.salaryRevisionHistory.findMany({
          where: { employeeId },
          orderBy: { effectiveDate: 'desc' },
        }),
      ]);
      return NextResponse.json({ success: true, data: { structure, revisions } });
    }

    const [structures, employees, revisions] = await Promise.all([
      db.salaryStructure.findMany(),
      db.employee.findMany({
        where: { status: { not: 'Offboarded' } },
        select: {
          id: true,
          name: true,
          employeeCode: true,
          department: true,
          roleTitle: true,
          salary: true,
        },
      }),
      db.salaryRevisionHistory.findMany({
        orderBy: { effectiveDate: 'desc' },
        take: 100,
      }),
    ]);

    const structureMap = new Map(structures.map((s) => [s.employeeId, s]));

    const merged = employees.map((emp) => {
      const s = structureMap.get(emp.id);
      const ctcAnnual = s?.ctcAnnual ?? Number(emp.salary);
      const monthly = ctcAnnual / 12;
      const basic = s?.basicMonthly ?? Math.round(monthly * 0.5);
      const hra = s?.hraMonthly ?? Math.round(monthly * 0.25);
      const conv = s?.conveyanceMonthly ?? 1600;
      const med = s?.medicalAllowanceMonthly ?? 1250;
      const special = s?.specialAllowanceMonthly ?? Math.max(0, Math.round(monthly - basic - hra - conv - med));
      const pf = s?.pfEmployeeMonthly ?? 1800;
      const pt = s?.ptMonthly ?? 200;

      return {
        id: s?.id ?? `sal-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.department,
        roleTitle: emp.roleTitle,
        ctcAnnual,
        basicMonthly: basic,
        hraMonthly: hra,
        conveyanceMonthly: conv,
        specialAllowanceMonthly: special,
        medicalAllowanceMonthly: med,
        pfEmployeeMonthly: pf,
        ptMonthly: pt,
        effectiveFrom: s?.effectiveFrom ?? '2026-04-01',
        isActive: s?.isActive ?? true,
      };
    });

    return NextResponse.json({ success: true, data: merged, revisions });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching salary structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salary structures' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = (await getCurrentEmployee()) || { id: 'EMP-006', userRole: 'admin' };
    const body = await request.json();
    const {
      employeeId,
      ctcAnnual,
      basicMonthly,
      hraMonthly,
      conveyanceMonthly = 1600,
      specialAllowanceMonthly,
      medicalAllowanceMonthly = 1250,
      pfEmployeeMonthly = 1800,
      ptMonthly = 200,
      effectiveFrom = new Date().toISOString().split('T')[0],
      revisionType = 'MarketAdjustment',
      reason = 'Salary structure adjustment and CTC revision',
      source = 'CompensationEngine',
    } = body;

    if (!employeeId || !ctcAnnual) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and annual CTC are required.' },
        { status: 400 }
      );
    }

    const previousStructure = await db.salaryStructure.findUnique({
      where: { employeeId },
    });

    const previousCtc = previousStructure?.ctcAnnual ?? 0;
    const previousBasic = previousStructure?.basicMonthly ?? 0;
    const previousHra = previousStructure?.hraMonthly ?? 0;
    const previousSpecial = previousStructure?.specialAllowanceMonthly ?? 0;

    const result = await db.$transaction(async (tx) => {
      // 1. Upsert active SalaryStructure
      const structure = await tx.salaryStructure.upsert({
        where: { employeeId },
        update: {
          ctcAnnual: Number(ctcAnnual),
          basicMonthly: Number(basicMonthly),
          hraMonthly: Number(hraMonthly),
          conveyanceMonthly: Number(conveyanceMonthly),
          specialAllowanceMonthly: Number(specialAllowanceMonthly),
          medicalAllowanceMonthly: Number(medicalAllowanceMonthly),
          pfEmployeeMonthly: Number(pfEmployeeMonthly),
          ptMonthly: Number(ptMonthly),
          effectiveFrom,
          isActive: true,
        },
        create: {
          employeeId,
          ctcAnnual: Number(ctcAnnual),
          basicMonthly: Number(basicMonthly),
          hraMonthly: Number(hraMonthly),
          conveyanceMonthly: Number(conveyanceMonthly),
          specialAllowanceMonthly: Number(specialAllowanceMonthly),
          medicalAllowanceMonthly: Number(medicalAllowanceMonthly),
          pfEmployeeMonthly: Number(pfEmployeeMonthly),
          ptMonthly: Number(ptMonthly),
          effectiveFrom,
          isActive: true,
        },
      });

      // 2. Update Employee.salary column for consistent CTC representation
      await tx.employee.update({
        where: { id: employeeId },
        data: { salary: Number(ctcAnnual) },
      });

      // 3. Create immutable SalaryRevisionHistory record
      const revision = await tx.salaryRevisionHistory.create({
        data: {
          id: `rev-${Date.now().toString(36)}`,
          employeeId,
          previousCtcAnnual: Number(previousCtc),
          newCtcAnnual: Number(ctcAnnual),
          previousBasicMonthly: Number(previousBasic),
          newBasicMonthly: Number(basicMonthly),
          previousHraMonthly: Number(previousHra),
          newHraMonthly: Number(hraMonthly),
          previousSpecialMonthly: Number(previousSpecial),
          newSpecialMonthly: Number(specialAllowanceMonthly),
          effectiveDate: effectiveFrom,
          revisionType,
          reason,
          source,
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'UPDATE',
          module: 'Compensation',
          employeeId,
          details: JSON.stringify({
            previousCtc,
            newCtc: ctcAnnual,
            revisionType,
            reason,
          }),
        },
      });

      // 5. User Notification
      await tx.userNotification.create({
        data: {
          id: `notif-${Date.now()}`,
          userId: employeeId,
          title: 'Salary Structure Revised',
          message: `Your annual CTC has been revised to ₹${Number(ctcAnnual).toLocaleString('en-IN')} effective from ${effectiveFrom}.`,
          type: 'Approval',
          linkUrl: '/payroll',
        },
      });

      return { structure, revision };
    });

    return NextResponse.json({ success: true, data: result.structure, revision: result.revision });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error saving salary structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save salary structure' },
      { status: 500 }
    );
  }
}
