import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { generateForm16Statement } from '@/lib/payroll/form16-service';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const financialYear = url.searchParams.get('financialYear') || '2026-27';

    // Role check: non-admin can only see own Form 16
    const targetId = user.userRole === 'admin' ? employeeId : user.id;

    // Fetch employee, structure, tax declaration, and cycle items
    const [employee, salaryStructure, taxDeclaration, cycleItems] = await Promise.all([
      db.employee.findUnique({
        where: { id: targetId },
        select: {
          id: true,
          employeeCode: true,
          name: true,
          department: true,
          roleTitle: true,
          email: true,
          joinDate: true,
          salary: true,
        },
      }),
      db.salaryStructure.findUnique({
        where: { employeeId: targetId },
      }),
      db.employeeTaxDeclaration.findUnique({
        where: {
          employeeId_financialYear: {
            employeeId: targetId,
            financialYear,
          },
        },
      }),
      db.payrollCycleItem.findMany({
        where: { employeeId: targetId },
        include: { cycle: true },
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
    }

    const annualCtc = salaryStructure?.ctcAnnual ?? (Number(employee.salary) || 600000);
    const basicMonthly = salaryStructure?.basicMonthly ?? Math.round((annualCtc / 12) * 0.5);
    const hraMonthly = salaryStructure?.hraMonthly ?? Math.round((annualCtc / 12) * 0.25);
    const conveyanceMonthly = salaryStructure?.conveyanceMonthly ?? 1600;
    const specialAllowanceMonthly = salaryStructure?.specialAllowanceMonthly ?? Math.max(0, (annualCtc / 12) - basicMonthly - hraMonthly - conveyanceMonthly);
    const medicalAllowanceMonthly = salaryStructure?.medicalAllowanceMonthly ?? 1250;
    const ltaMonthly = salaryStructure?.ltaMonthly ?? 0;

    const statement = generateForm16Statement({
      employee: {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        roleTitle: employee.roleTitle,
        email: employee.email,
        pan: 'ABCDE1234F',
        joinDate: employee.joinDate,
      },
      financialYear,
      annualSalaryStructure: {
        ctcAnnual: annualCtc,
        basicMonthly,
        hraMonthly,
        conveyanceMonthly,
        specialAllowanceMonthly,
        medicalAllowanceMonthly,
        ltaMonthly,
      },
      monthlyPayrollItems: cycleItems.map((c) => ({
        monthYear: c.cycle.monthYear,
        grossEarnings: c.grossEarnings,
        basic: c.basic,
        hra: c.hra,
        tds: c.tds,
        pfEmployee: c.pfEmployee,
        pt: c.pt,
      })),
      taxDeclaration: taxDeclaration
        ? {
            regime: taxDeclaration.regime as 'Old' | 'New',
            financialYear: taxDeclaration.financialYear,
            section80C: taxDeclaration.section80C,
            section80D: taxDeclaration.section80D,
            section80G: taxDeclaration.section80G,
            section80CCD_1B: taxDeclaration.section80CCD_1B,
            section80E: taxDeclaration.section80E,
            section80TTA: taxDeclaration.section80TTA,
            hraExemptionRent: taxDeclaration.hraExemptionRent,
            homeLoanInterest: taxDeclaration.homeLoanInterest,
            otherExemptions: taxDeclaration.otherExemptions,
            declarationStatus: taxDeclaration.declarationStatus,
            isMetroCity: true,
          }
        : undefined,
    });

    // Optionally save snapshot in Form16Record
    await db.form16Record.upsert({
      where: {
        employeeId_financialYear: {
          employeeId: targetId,
          financialYear,
        },
      },
      update: {
        pan: statement.employee.pan,
        regime: statement.partB.regimeSelected,
        grossSalary: statement.partB.grossSalary.totalGross,
        exemptionsTotal: statement.partB.exemptionsUnderSection10.totalExemptions,
        netSalary: statement.partB.totalSalaryAfterExemptions,
        deductionsTotal: statement.partB.deductionsUnderChapterVIA.totalDeductions,
        taxableIncome: statement.partB.totalTaxableIncome,
        totalTax: statement.partB.taxOnTotalIncome,
        cess: statement.partB.healthAndEducationCess,
        netTdsDeducted: statement.partA.totalTaxDeducted,
        partAJson: JSON.stringify(statement.partA),
        partBJson: JSON.stringify(statement.partB),
      },
      create: {
        id: `f16-${targetId}-${financialYear}`,
        employeeId: targetId,
        financialYear,
        pan: statement.employee.pan,
        regime: statement.partB.regimeSelected,
        grossSalary: statement.partB.grossSalary.totalGross,
        exemptionsTotal: statement.partB.exemptionsUnderSection10.totalExemptions,
        netSalary: statement.partB.totalSalaryAfterExemptions,
        deductionsTotal: statement.partB.deductionsUnderChapterVIA.totalDeductions,
        taxableIncome: statement.partB.totalTaxableIncome,
        totalTax: statement.partB.taxOnTotalIncome,
        cess: statement.partB.healthAndEducationCess,
        netTdsDeducted: statement.partA.totalTaxDeducted,
        partAJson: JSON.stringify(statement.partA),
        partBJson: JSON.stringify(statement.partB),
      },
    });

    return NextResponse.json({ success: true, data: statement });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error generating Form 16 statement:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate Form 16 statement' }, { status: 500 });
  }
}
