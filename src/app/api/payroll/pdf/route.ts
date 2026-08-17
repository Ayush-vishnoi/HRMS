import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { renderForm16Html, renderPayslipHtml } from '@/lib/payroll/pdf-service';
import { generateForm16Statement } from '@/lib/payroll/form16-service';

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { documentType = 'payslip', payslipId, employeeId, financialYear = '2026-27' } = body;

    if (documentType === 'payslip') {
      const slip = await db.payslip.findUnique({
        where: { id: payslipId },
        include: {
          employee: true,
        },
      });

      if (!slip) {
        return NextResponse.json({ success: false, error: 'Payslip not found.' }, { status: 404 });
      }

      // Check access permission
      if (user.userRole !== 'admin' && slip.employeeId !== user.id) {
        return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
      }

      // Try to find cycle item for enriched details
      const cycleItem = await db.payrollCycleItem.findFirst({
        where: {
          employeeId: slip.employeeId,
          cycle: { monthYear: slip.monthYear },
        },
      });

      const html = renderPayslipHtml({
        companyName: 'MYLOTIC GROUP PRIVATE LIMITED',
        companyAddress: '100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066',
        companyPanTan: 'PAN: AABCM9876E | TAN: BLRA12345E',
        monthYear: slip.monthYear,
        paymentDate: slip.paymentDate,
        status: slip.status,
        employee: {
          name: slip.employee?.name || user.name,
          code: slip.employee?.employeeCode || 'EMP-001',
          designation: slip.employee?.roleTitle || 'Employee',
          department: slip.employee?.department || 'General',
          pan: cycleItem?.panNumber || 'ABCDE1234F',
          bankName: 'HDFC Bank',
          accountNo: cycleItem?.bankAccountMasked || '•••• •••• 4921',
          ifsc: cycleItem?.bankIfsc || 'HDFC0001234',
          uan: '100234567890',
          payableDays: cycleItem?.payableDays || 30,
          lossOfPayDays: cycleItem?.lossOfPayDays || 0,
        },
        earnings: {
          basic: Number(slip.basicSalary),
          hra: Number(slip.hra),
          conveyance: Number(slip.conveyance),
          specialAllowance: Number(slip.specialAllowance),
          medicalAllowance: cycleItem?.medicalAllowance || 1250,
          lta: cycleItem?.lta || 0,
          bonus: cycleItem?.bonus || 0,
          overtimePay: cycleItem?.overtimePay || 0,
          arrears: cycleItem?.arrears || 0,
          reimbursements: cycleItem?.reimbursements || 0,
          grossEarnings: Number(slip.grossEarnings),
        },
        deductions: {
          pfEmployee: Number(slip.pfDeduction),
          esicEmployee: cycleItem?.esicEmployee || 0,
          pt: cycleItem?.pt || 200,
          tds: Number(slip.taxDeduction),
          lwf: cycleItem?.lwf || 0,
          loanDeduction: cycleItem?.loanDeduction || 0,
          lossOfPayDeduction: cycleItem?.lossOfPayDeduction || 0,
          totalDeductions: Number(slip.totalDeductions),
        },
        employerContributions: {
          pfEmployer: cycleItem?.pfEmployer || 1800,
          esicEmployer: cycleItem?.esicEmployer || 0,
          gratuityProvision: cycleItem?.gratuityProvision || 0,
        },
        netPayable: Number(slip.netPayable),
      });

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    if (documentType === 'form16') {
      const targetEmpId = employeeId && user.userRole === 'admin' ? employeeId : user.id;

      const employee = await db.employee.findUnique({
        where: { id: targetEmpId },
      });
      const structure = await db.salaryStructure.findUnique({
        where: { employeeId: targetEmpId },
      });
      const declaration = await db.employeeTaxDeclaration.findUnique({
        where: {
          employeeId_financialYear: {
            employeeId: targetEmpId,
            financialYear,
          },
        },
      });

      if (!employee) {
        return NextResponse.json({ success: false, error: 'Employee not found.' }, { status: 404 });
      }

      const annualCtc = structure?.ctcAnnual ?? (Number(employee.salary) || 600000);
      const basicMonthly = structure?.basicMonthly ?? Math.round((annualCtc / 12) * 0.5);
      const hraMonthly = structure?.hraMonthly ?? Math.round((annualCtc / 12) * 0.25);
      const conveyanceMonthly = structure?.conveyanceMonthly ?? 1600;
      const specialAllowanceMonthly = structure?.specialAllowanceMonthly ?? Math.max(0, (annualCtc / 12) - basicMonthly - hraMonthly - conveyanceMonthly);
      const medicalAllowanceMonthly = structure?.medicalAllowanceMonthly ?? 1250;
      const ltaMonthly = structure?.ltaMonthly ?? 0;

      const form16Data = generateForm16Statement({
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
        taxDeclaration: declaration ? {
          regime: declaration.regime as 'Old' | 'New',
          financialYear: declaration.financialYear,
          section80C: declaration.section80C,
          section80D: declaration.section80D,
          section80G: declaration.section80G,
          section80CCD_1B: declaration.section80CCD_1B,
          section80E: declaration.section80E,
          section80TTA: declaration.section80TTA,
          hraExemptionRent: declaration.hraExemptionRent,
          homeLoanInterest: declaration.homeLoanInterest,
          otherExemptions: declaration.otherExemptions,
          declarationStatus: declaration.declarationStatus,
          isMetroCity: true,
        } : undefined,
      });

      const html = renderForm16Html(form16Data);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid document type.' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error generating document:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate document' }, { status: 500 });
  }
}
