import type {
  CalculatedPayrollItem,
  EmployeePayrollInput,
  ReconciliationSummary,
  TaxDeclarationInput,
} from './types';
import {
  calculateESIC,
  calculateGratuityProvision,
  calculateLWF,
  calculateProfessionalTax,
  calculateProvidentFund,
} from './statutory-engine';
import { computeIndianIncomeTax } from './india-tax-engine';

/**
 * Calculates monthly payroll for a single employee with proration, attendance LOP,
 * overtime, variable pay, arrears, loan EMI, expense claims, statutory engine, and tax engine.
 */
export function calculateEmployeeMonthlyPayroll(
  input: EmployeePayrollInput,
  monthIndex: number = 1 // 1-12
): CalculatedPayrollItem {
  const totalCalendarDays = Math.max(1, input.attendance.totalCalendarDays || 30);
  const lossOfPayDays = Math.max(0, input.attendance.lossOfPayDays || 0);
  const payableDays = Math.max(0, totalCalendarDays - lossOfPayDays);

  // 1. Check for Mid-Month Salary Revision Proration
  let basic = 0;
  let hra = 0;
  let conveyance = 0;
  let special = 0;
  let medical = 0;
  let lta = 0;

  if (input.salaryRevisionsInMonth && input.salaryRevisionsInMonth.length > 0) {
    // E.g., revision effective from 15th
    const rev = input.salaryRevisionsInMonth[0];
    const effectiveDay = Number.parseInt(rev.effectiveDate.split('-')[2] || '15', 10);
    const daysBefore = Math.max(0, Math.min(totalCalendarDays, effectiveDay - 1));
    const daysAfter = Math.max(0, totalCalendarDays - daysBefore);

    const oldRatio = daysBefore / totalCalendarDays;
    const newRatio = daysAfter / totalCalendarDays;

    const oldBasic = input.activeSalaryStructure.basicMonthly;
    const newBasic = rev.newBasicMonthly;
    basic = (oldBasic * oldRatio + newBasic * newRatio) * (payableDays / totalCalendarDays);

    const oldHra = input.activeSalaryStructure.hraMonthly;
    const newHra = rev.newHraMonthly;
    hra = (oldHra * oldRatio + newHra * newRatio) * (payableDays / totalCalendarDays);

    const oldSpecial = input.activeSalaryStructure.specialAllowanceMonthly;
    const newSpecial = rev.newSpecialMonthly;
    special = (oldSpecial * oldRatio + newSpecial * newRatio) * (payableDays / totalCalendarDays);

    conveyance = input.activeSalaryStructure.conveyanceMonthly * (payableDays / totalCalendarDays);
    medical = input.activeSalaryStructure.medicalAllowanceMonthly * (payableDays / totalCalendarDays);
    lta = (input.activeSalaryStructure.ltaMonthly || 0) * (payableDays / totalCalendarDays);
  } else {
    // Standard Attendance Proration
    const prorationRatio = payableDays / totalCalendarDays;
    basic = input.activeSalaryStructure.basicMonthly * prorationRatio;
    hra = input.activeSalaryStructure.hraMonthly * prorationRatio;
    conveyance = input.activeSalaryStructure.conveyanceMonthly * prorationRatio;
    special = input.activeSalaryStructure.specialAllowanceMonthly * prorationRatio;
    medical = input.activeSalaryStructure.medicalAllowanceMonthly * prorationRatio;
    lta = (input.activeSalaryStructure.ltaMonthly || 0) * prorationRatio;
  }

  // Round core earnings
  const roundedBasic = Math.round(basic);
  const roundedHra = Math.round(hra);
  const roundedConveyance = Math.round(conveyance);
  const roundedSpecial = Math.round(special);
  const roundedMedical = Math.round(medical);
  const roundedLta = Math.round(lta);

  // Full nominal gross without LOP
  const nominalMonthlyGross =
    input.activeSalaryStructure.basicMonthly +
    input.activeSalaryStructure.hraMonthly +
    input.activeSalaryStructure.conveyanceMonthly +
    input.activeSalaryStructure.specialAllowanceMonthly +
    input.activeSalaryStructure.medicalAllowanceMonthly +
    (input.activeSalaryStructure.ltaMonthly || 0);

  const proratedCoreEarnings =
    roundedBasic + roundedHra + roundedConveyance + roundedSpecial + roundedMedical + roundedLta;
  const lossOfPayDeduction = Math.max(0, nominalMonthlyGross - proratedCoreEarnings);

  // 2. Overtime Pay Calculation
  let overtimePay = 0;
  if (input.overtime && input.overtime.approvedMinutes > 0) {
    const defaultHourlyRate = ((roundedBasic + roundedSpecial) / (totalCalendarDays * 8)) * 1.5;
    const hourlyRate = input.overtime.hourlyRate || defaultHourlyRate;
    overtimePay = Math.round((input.overtime.approvedMinutes / 60) * hourlyRate);
  }

  // 3. Variable Pay / Bonus / Arrears / Reimbursements
  const bonus = Math.round(input.variablePay?.bonus || 0);
  const incentives = Math.round(input.variablePay?.incentives || 0);
  const arrears = Math.round(input.variablePay?.arrears || 0);
  const reimbursements = Math.round(input.expenseClaims?.approvedReimbursements || 0);

  const grossEarnings =
    roundedBasic +
    roundedHra +
    roundedConveyance +
    roundedSpecial +
    roundedMedical +
    roundedLta +
    overtimePay +
    bonus +
    incentives +
    arrears +
    reimbursements;

  // 4. Statutory Deductions
  const pfResult = calculateProvidentFund(roundedBasic);
  const pfEmployee = pfResult.employeePF;
  const pfEmployer = pfResult.employerPF;

  // ESIC on monthly gross earnings excluding non-taxable reimbursements
  const esicGross = Math.max(0, grossEarnings - reimbursements);
  const esicResult = calculateESIC(esicGross);
  const esicEmployee = esicResult.employeeESIC;
  const esicEmployer = esicResult.employerESIC;

  const state = input.locationState || 'Karnataka';
  const pt = calculateProfessionalTax(esicGross, state, monthIndex);
  const lwfResult = calculateLWF(state, monthIndex);
  const lwf = lwfResult.employeeLWF;
  const gratuityProvision = calculateGratuityProvision(roundedBasic);

  // 5. Loan EMI Deductions
  let loanDeduction = 0;
  if (input.activeLoans && input.activeLoans.length > 0) {
    for (const loan of input.activeLoans) {
      if (!loan.isPaused && loan.remainingBalance > 0) {
        const emiToDeduct = Math.min(loan.monthlyEmi, loan.remainingBalance);
        loanDeduction += emiToDeduct;
      }
    }
  }
  loanDeduction = Math.round(loanDeduction);

  // 6. Income Tax TDS Calculation
  const annualGrossProjected = esicGross * 12 + bonus;
  const annualBasicProjected = roundedBasic * 12;
  const annualHraProjected = roundedHra * 12;

  const taxResult = computeIndianIncomeTax({
    regime: input.taxDeclaration?.regime || 'New',
    annualGrossSalary: annualGrossProjected,
    annualBasic: annualBasicProjected,
    annualHRA: annualHraProjected,
    annualPT: pt * 12,
    declarations: input.taxDeclaration,
    priorTdsDeductedInYear: input.priorTdsDeductedInYear || 0,
    priorMonthsElapsedInFY: input.priorMonthsElapsedInFY || 0,
  });

  const tds = taxResult.monthlyTdsProjected;

  // 7. Net Salary
  const otherDeductions = 0;
  const totalDeductions =
    pfEmployee + esicEmployee + pt + lwf + tds + loanDeduction + otherDeductions;
  const netPayable = Math.max(0, grossEarnings - totalDeductions);

  // 8. Detailed Calculation Snapshot
  const snapshotData = {
    calculatedAt: new Date().toISOString(),
    employee: {
      id: input.employeeId,
      code: input.employeeCode,
      name: input.employeeName,
      department: input.department,
      locationState: state,
    },
    attendance: {
      totalCalendarDays,
      payableDays,
      lossOfPayDays,
      lossOfPayDeduction,
    },
    earnings: {
      basic: roundedBasic,
      hra: roundedHra,
      conveyance: roundedConveyance,
      specialAllowance: roundedSpecial,
      medicalAllowance: roundedMedical,
      lta: roundedLta,
      overtimePay,
      bonus,
      incentives,
      arrears,
      reimbursements,
      grossEarnings,
    },
    deductions: {
      pfEmployee,
      esicEmployee,
      pt,
      lwf,
      tds,
      loanDeduction,
      otherDeductions,
      totalDeductions,
    },
    employerContributions: {
      pfEmployer,
      employerEPS: pfResult.employerEPS,
      employerEPF: pfResult.employerEPF,
      esicEmployer,
      employerLWF: lwfResult.employerLWF,
      gratuityProvision,
    },
    taxComputation: taxResult,
    netPayable,
  };

  return {
    employeeId: input.employeeId,
    employeeCode: input.employeeCode,
    employeeName: input.employeeName,
    department: input.department,
    payableDays,
    lossOfPayDays,
    lossOfPayDeduction,
    basic: roundedBasic,
    hra: roundedHra,
    conveyance: roundedConveyance,
    specialAllowance: roundedSpecial,
    medicalAllowance: roundedMedical,
    lta: roundedLta,
    bonus,
    incentives,
    overtimePay,
    arrears,
    reimbursements,
    grossEarnings,
    pfEmployee,
    pfEmployer,
    esicEmployee,
    esicEmployer,
    pt,
    tds,
    lwf,
    loanDeduction,
    otherDeductions,
    gratuityProvision,
    totalDeductions,
    netPayable,
    taxRegime: taxResult.regime,
    bankAccountMasked: input.bankAccountMasked,
    bankIfsc: input.bankIfsc,
    panNumber: input.panNumber,
    calculationSnapshotJson: JSON.stringify(snapshotData),
  };
}
