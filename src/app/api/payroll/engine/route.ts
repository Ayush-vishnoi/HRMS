import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';
import { calculateEmployeeMonthlyPayroll } from '@/lib/payroll/payroll-engine';
import type { EmployeePayrollInput } from '@/lib/payroll/types';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');

    if (cycleId) {
      const cycle = await db.payrollCycle.findUnique({
        where: { id: cycleId },
        include: { items: true },
      });
      return NextResponse.json({ success: true, data: cycle });
    }

    const cycles = await db.payrollCycle.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: cycles });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching payroll cycles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payroll cycles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = (await getCurrentEmployee()) || { id: 'EMP-006', userRole: 'admin', name: 'Ayush Vishnoi' };
    const body = await request.json();
    const { monthYear, cycleStartDate, cycleEndDate, country = 'IN', currency = 'INR' } = body;

    if (!monthYear || !cycleStartDate || !cycleEndDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required payroll cycle dates.' },
        { status: 400 }
      );
    }

    // Determine month index (1-12) from monthYear or startDate
    const startDateObj = new Date(cycleStartDate);
    const monthIndex = startDateObj.getMonth() + 1;

    // Financial year (e.g. 2026-27)
    const year = startDateObj.getFullYear();
    const financialYear = monthIndex >= 4 ? `${year}-${String(year + 1).slice(2)}` : `${year - 1}-${String(year).slice(2)}`;

    // 1. Fetch all active employees
    const employees = await db.employee.findMany({
      where: { status: { not: 'Offboarded' } },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        roleTitle: true,
        location: true,
        salary: true,
        joinDate: true,
      },
    });

    // 2. Fetch active SalaryStructures
    const salaryStructures = await db.salaryStructure.findMany({
      where: { isActive: true },
    });
    const salaryMap = new Map(salaryStructures.map((s) => [s.employeeId, s]));

    // 3. Fetch Salary Revisions in this period
    const revisions = await db.salaryRevisionHistory.findMany({
      where: {
        effectiveDate: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
      },
    });
    const revisionMap = new Map<string, typeof revisions>();
    for (const r of revisions) {
      const list = revisionMap.get(r.employeeId) || [];
      list.push(r);
      revisionMap.set(r.employeeId, list);
    }

    // 4. Fetch Attendance records
    const attendanceRecords = await db.attendanceRecord.findMany({
      where: {
        date: {
          gte: cycleStartDate,
          lte: cycleEndDate,
        },
      },
    });
    const attendanceMap = new Map<string, typeof attendanceRecords>();
    for (const att of attendanceRecords) {
      const list = attendanceMap.get(att.employeeId) || [];
      list.push(att);
      attendanceMap.set(att.employeeId, list);
    }

    // 5. Fetch approved Overtime requests
    const overtimeRequests = await db.overtimeRequest.findMany({
      where: {
        status: 'Approved',
        date: {
          gte: new Date(cycleStartDate),
          lte: new Date(cycleEndDate),
        },
      },
    });
    const overtimeMap = new Map<string, number>();
    for (const ot of overtimeRequests) {
      const mins = ot.approved_minutes ?? ot.requested_minutes;
      overtimeMap.set(ot.employeeId, (overtimeMap.get(ot.employeeId) || 0) + mins);
    }

    // 6. Fetch approved Variable Pay (Bonus, Incentives, Arrears)
    const variablePays = await db.variablePayRecord.findMany({
      where: {
        monthYear,
        status: 'Approved',
      },
    });
    const bonusMap = new Map<string, number>();
    const incentiveMap = new Map<string, number>();
    const arrearMap = new Map<string, number>();
    for (const vp of variablePays) {
      if (vp.payType === 'Bonus' || vp.payType === 'PerformanceBonus') {
        bonusMap.set(vp.employeeId, (bonusMap.get(vp.employeeId) || 0) + vp.amount);
      } else if (vp.payType === 'SalesIncentive' || vp.payType === 'Commission') {
        incentiveMap.set(vp.employeeId, (incentiveMap.get(vp.employeeId) || 0) + vp.amount);
      } else if (vp.payType === 'Arrear') {
        arrearMap.set(vp.employeeId, (arrearMap.get(vp.employeeId) || 0) + vp.amount);
      }
    }

    // 7. Fetch eligible approved ExpenseClaims
    const expenseClaims = await db.expenseClaim.findMany({
      where: {
        managerStatus: 'Approved',
        financeStatus: 'Approved',
        paymentStatus: 'Pending',
      },
    });
    const expenseMap = new Map<string, number>();
    for (const exp of expenseClaims) {
      const amt = exp.approvedAmount ?? exp.amount;
      expenseMap.set(exp.employeeId, (expenseMap.get(exp.employeeId) || 0) + amt);
    }

    // 8. Fetch active Loans & Advances
    const loans = await db.employeeLoanAdvance.findMany({
      where: { status: 'Active' },
    });
    const loanMap = new Map<string, typeof loans>();
    for (const l of loans) {
      const list = loanMap.get(l.employeeId) || [];
      list.push(l);
      loanMap.set(l.employeeId, list);
    }

    // 9. Fetch Tax Declarations
    const taxDeclarations = await db.employeeTaxDeclaration.findMany({
      where: { financialYear },
    });
    const taxMap = new Map(taxDeclarations.map((t) => [t.employeeId, t]));

    // Calculate total days in calendar month
    const startDay = new Date(cycleStartDate);
    const endDay = new Date(cycleEndDate);
    const totalCalendarDays = Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    const itemsToCreate = employees.map((emp) => {
      const struct = salaryMap.get(emp.id);
      const annualCtc = struct ? struct.ctcAnnual : Number(emp.salary) || 600000;
      const monthly = annualCtc / 12;

      const basicMonthly = struct?.basicMonthly ?? Math.round(monthly * 0.5);
      const hraMonthly = struct?.hraMonthly ?? Math.round(monthly * 0.25);
      const conveyanceMonthly = struct?.conveyanceMonthly ?? 1600;
      const medicalAllowanceMonthly = struct?.medicalAllowanceMonthly ?? 1250;
      const ltaMonthly = struct?.ltaMonthly ?? 0;
      const statutoryBonusMonthly = struct?.statutoryBonusMonthly ?? 0;
      const specialAllowanceMonthly =
        struct?.specialAllowanceMonthly ??
        Math.max(0, Math.round(monthly - basicMonthly - hraMonthly - conveyanceMonthly - medicalAllowanceMonthly));

      // Attendance logic
      const empAtt = attendanceMap.get(emp.id) || [];
      const absentCount = empAtt.filter((a) => a.status === 'Absent').length;
      const lossOfPayDays = absentCount;
      const presentDays = Math.max(0, totalCalendarDays - lossOfPayDays);

      const empRevs = (revisionMap.get(emp.id) || []).map((r) => ({
        effectiveDate: r.effectiveDate,
        newCtcAnnual: r.newCtcAnnual,
        newBasicMonthly: r.newBasicMonthly,
        newHraMonthly: r.newHraMonthly,
        newSpecialMonthly: r.newSpecialMonthly,
      }));

      const empLoans = (loanMap.get(emp.id) || []).map((l) => ({
        loanId: l.id,
        monthlyEmi: l.monthlyEmi,
        remainingBalance: l.remainingBalance,
        isPaused: l.pausedMonths.includes(monthYear),
      }));

      const empTaxDecl = taxMap.get(emp.id);

      const payrollInput: EmployeePayrollInput = {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department,
        designation: emp.roleTitle,
        locationState: emp.location?.includes('Karnataka') ? 'Karnataka' : emp.location?.includes('Maharashtra') ? 'Maharashtra' : 'Karnataka',
        isMetro: true,
        joinDate: emp.joinDate,
        panNumber: 'ABCDE1234F',
        bankAccountMasked: '•••• •••• 4921',
        bankIfsc: 'HDFC0001234',
        activeSalaryStructure: {
          ctcAnnual: annualCtc,
          basicMonthly,
          hraMonthly,
          conveyanceMonthly,
          specialAllowanceMonthly,
          medicalAllowanceMonthly,
          ltaMonthly,
          statutoryBonusMonthly,
          pfEmployerMonthly: struct?.pfEmployerMonthly ?? 1800,
          pfEmployeeMonthly: struct?.pfEmployeeMonthly ?? 1800,
          esicEmployerMonthly: struct?.esicEmployerMonthly ?? 0,
          esicEmployeeMonthly: struct?.esicEmployeeMonthly ?? 0,
          ptMonthly: struct?.ptMonthly ?? 200,
          gratuityMonthly: struct?.gratuityMonthly ?? 0,
          effectiveFrom: struct?.effectiveFrom ?? '2026-04-01',
        },
        salaryRevisionsInMonth: empRevs,
        attendance: {
          totalCalendarDays,
          presentDays,
          approvedLeaveDays: 0,
          lossOfPayDays,
        },
        overtime: {
          approvedMinutes: overtimeMap.get(emp.id) || 0,
        },
        variablePay: {
          bonus: bonusMap.get(emp.id) || 0,
          incentives: incentiveMap.get(emp.id) || 0,
          arrears: arrearMap.get(emp.id) || 0,
        },
        expenseClaims: {
          approvedReimbursements: expenseMap.get(emp.id) || 0,
        },
        activeLoans: empLoans,
        taxDeclaration: empTaxDecl
          ? {
              regime: empTaxDecl.regime as 'Old' | 'New',
              financialYear: empTaxDecl.financialYear,
              section80C: empTaxDecl.section80C,
              section80D: empTaxDecl.section80D,
              section80G: empTaxDecl.section80G,
              section80CCD_1B: empTaxDecl.section80CCD_1B,
              section80E: empTaxDecl.section80E,
              section80TTA: empTaxDecl.section80TTA,
              hraExemptionRent: empTaxDecl.hraExemptionRent,
              homeLoanInterest: empTaxDecl.homeLoanInterest,
              otherExemptions: empTaxDecl.otherExemptions,
              declarationStatus: empTaxDecl.declarationStatus,
              isMetroCity: true,
            }
          : undefined,
      };

      const calculated = calculateEmployeeMonthlyPayroll(payrollInput, monthIndex);

      totalGross += calculated.grossEarnings;
      totalDeductions += calculated.totalDeductions;
      totalNet += calculated.netPayable;

      return {
        id: `item-${emp.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        department: emp.department,
        basic: calculated.basic,
        hra: calculated.hra,
        conveyance: calculated.conveyance,
        specialAllowance: calculated.specialAllowance,
        medicalAllowance: calculated.medicalAllowance,
        lta: calculated.lta,
        bonus: calculated.bonus,
        incentives: calculated.incentives,
        overtimePay: calculated.overtimePay,
        arrears: calculated.arrears,
        reimbursements: calculated.reimbursements,
        grossEarnings: calculated.grossEarnings,
        pfEmployee: calculated.pfEmployee,
        pfEmployer: calculated.pfEmployer,
        esicEmployee: calculated.esicEmployee,
        esicEmployer: calculated.esicEmployer,
        pt: calculated.pt,
        tds: calculated.tds,
        lwf: calculated.lwf,
        loanDeduction: calculated.loanDeduction,
        gratuityProvision: calculated.gratuityProvision,
        taxRegime: calculated.taxRegime,
        payableDays: calculated.payableDays,
        lossOfPayDays: calculated.lossOfPayDays,
        lossOfPayDeduction: calculated.lossOfPayDeduction,
        otherDeductions: calculated.otherDeductions,
        totalDeductions: calculated.totalDeductions,
        netPayable: calculated.netPayable,
        calculationSnapshotJson: calculated.calculationSnapshotJson,
        bankAccountMasked: calculated.bankAccountMasked,
        bankIfsc: calculated.bankIfsc,
        panNumber: calculated.panNumber,
        paymentStatus: 'Pending',
      };
    });

    // Save cycle with items
    const cycle = await db.payrollCycle.upsert({
      where: { monthYear },
      update: {
        cycleStartDate,
        cycleEndDate,
        totalEmployees: employees.length,
        totalGross: Math.round(totalGross),
        totalDeductions: Math.round(totalDeductions),
        totalNetPayable: Math.round(totalNet),
        status: 'Calculated',
        country,
        currency,
        processedById: user.id,
        items: {
          deleteMany: {},
          create: itemsToCreate,
        },
      },
      create: {
        id: `cycle-${Date.now().toString(36)}`,
        monthYear,
        cycleStartDate,
        cycleEndDate,
        totalEmployees: employees.length,
        totalGross: Math.round(totalGross),
        totalDeductions: Math.round(totalDeductions),
        totalNetPayable: Math.round(totalNet),
        status: 'Calculated',
        country,
        currency,
        processedById: user.id,
        items: {
          create: itemsToCreate,
        },
      },
      include: { items: true },
    });

    // Create Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'CALCULATE',
        module: 'Payroll',
        employeeId: user.id,
        details: JSON.stringify({
          monthYear,
          totalEmployees: employees.length,
          totalGross,
          totalNetPayable: totalNet,
        }),
      },
    });

    return NextResponse.json({ success: true, data: cycle }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error generating payroll cycle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payroll cycle' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = (await getCurrentEmployee()) || { id: 'EMP-006', userRole: 'admin', name: 'Ayush Vishnoi' };
    const body = await request.json();
    const { cycleId, action } = body; // 'under_review' | 'approve' | 'lock' | 'disburse'

    if (!cycleId || !action) {
      return NextResponse.json(
        { success: false, error: 'Cycle ID and action are required.' },
        { status: 400 }
      );
    }

    const cycle = await db.payrollCycle.findUnique({
      where: { id: cycleId },
      include: { items: true },
    });

    if (!cycle) {
      return NextResponse.json(
        { success: false, error: 'Payroll cycle not found.' },
        { status: 404 }
      );
    }

    // Enforce locked cycle immutability
    if (cycle.status === 'Locked' && action !== 'disburse') {
      return NextResponse.json(
        { success: false, error: 'Locked payroll cycles are strictly immutable. Corrections must use an adjustment mechanism.' },
        { status: 403 }
      );
    }

    let newStatus = cycle.status;
    let lockedAt = cycle.lockedAt;
    let disbursedAt = cycle.disbursedAt;
    let approvedById = cycle.approvedById;

    if (action === 'under_review') {
      newStatus = 'UnderReview';
    } else if (action === 'approve') {
      newStatus = 'Approved';
      approvedById = user.id;
    } else if (action === 'lock') {
      newStatus = 'Locked';
      lockedAt = new Date();

      // Transactionally deduct loan balances and update settled expense claims upon lock
      await db.$transaction(async (tx) => {
        for (const item of cycle.items) {
          if (item.loanDeduction > 0) {
            const activeLoans = await tx.employeeLoanAdvance.findMany({
              where: { employeeId: item.employeeId, status: 'Active' },
            });
            for (const loan of activeLoans) {
              const newBal = Math.max(0, loan.remainingBalance - item.loanDeduction);
              const newPaid = loan.paidInstallments + 1;
              await tx.employeeLoanAdvance.update({
                where: { id: loan.id },
                data: {
                  remainingBalance: newBal,
                  paidInstallments: newPaid,
                  status: newBal <= 0 ? 'Closed' : 'Active',
                },
              });
            }
          }

          if (item.reimbursements > 0) {
            await tx.expenseClaim.updateMany({
              where: {
                employeeId: item.employeeId,
                managerStatus: 'Approved',
                financeStatus: 'Approved',
                paymentStatus: 'Pending',
              },
              data: {
                paymentStatus: 'SettledInPayroll',
                settlementDate: new Date().toISOString().split('T')[0],
              },
            });
          }
        }
      });
    } else if (action === 'disburse') {
      newStatus = 'Disbursed';
      disbursedAt = new Date();

      // Automatically generate/upsert Payslips with complete snapshot
      const paymentDateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      for (const item of cycle.items) {
        await db.payslip.upsert({
          where: {
            employeeId_monthYear: {
              employeeId: item.employeeId,
              monthYear: cycle.monthYear,
            },
          },
          update: {
            basicSalary: item.basic,
            hra: item.hra,
            conveyance: item.conveyance,
            specialAllowance: item.specialAllowance,
            pfDeduction: item.pfEmployee,
            taxDeduction: item.tds,
            grossEarnings: item.grossEarnings,
            totalDeductions: item.totalDeductions,
            netPayable: item.netPayable,
            paymentDate: paymentDateStr,
            status: 'Paid',
          },
          create: {
            id: `PS-${item.employeeCode}-${Date.now().toString(36)}`,
            employeeId: item.employeeId,
            monthYear: cycle.monthYear,
            basicSalary: item.basic,
            hra: item.hra,
            conveyance: item.conveyance,
            specialAllowance: item.specialAllowance,
            pfDeduction: item.pfEmployee,
            taxDeduction: item.tds,
            grossEarnings: item.grossEarnings,
            totalDeductions: item.totalDeductions,
            netPayable: item.netPayable,
            paymentDate: paymentDateStr,
            status: 'Paid',
          },
        });

        // Notify employee
        await db.userNotification.create({
          data: {
            id: `notif-ps-${Date.now()}-${item.employeeId}`,
            userId: item.employeeId,
            title: `Payslip Available (${cycle.monthYear})`,
            message: `Your payslip for ${cycle.monthYear} with net payable ₹${Math.round(item.netPayable).toLocaleString('en-IN')} has been disbursed.`,
            type: 'System',
            linkUrl: '/payroll',
          },
        });
      }
    }

    const updated = await db.payrollCycle.update({
      where: { id: cycleId },
      data: {
        status: newStatus,
        lockedAt,
        disbursedAt,
        approvedById,
      },
      include: { items: true },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: action.toUpperCase(),
        module: 'Payroll',
        employeeId: user.id,
        details: JSON.stringify({
          cycleId,
          monthYear: cycle.monthYear,
          newStatus,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating payroll cycle status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payroll cycle status' },
      { status: 500 }
    );
  }
}
