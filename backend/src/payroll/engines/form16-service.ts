import type { Form16StatementData, TaxDeclarationInput, TaxRegime } from './types';
import { computeIndianIncomeTax } from './india-tax-engine';

export function generateForm16Statement(params: {
  employee: {
    id: string;
    employeeCode: string;
    name: string;
    department: string;
    roleTitle: string;
    email: string;
    pan?: string;
    joinDate?: string;
  };
  financialYear: string; // e.g. '2026-27'
  annualSalaryStructure: {
    ctcAnnual: number;
    basicMonthly: number;
    hraMonthly: number;
    conveyanceMonthly: number;
    specialAllowanceMonthly: number;
    medicalAllowanceMonthly: number;
    ltaMonthly: number;
  };
  monthlyPayrollItems?: Array<{
    monthYear: string;
    grossEarnings: number;
    basic: number;
    hra: number;
    tds: number;
    pfEmployee: number;
    pt: number;
  }>;
  taxDeclaration?: Partial<TaxDeclarationInput>;
}): Form16StatementData {
  const { employee, financialYear, annualSalaryStructure, monthlyPayrollItems = [], taxDeclaration } = params;

  const regime: TaxRegime = taxDeclaration?.regime || 'New';

  // Aggregate annual numbers from monthly payroll items or extrapolate from salary structure
  let annualGross = 0;
  let annualBasic = 0;
  let annualHRA = 0;
  let annualPT = 0;
  let annualTDS = 0;

  if (monthlyPayrollItems.length > 0) {
    for (const item of monthlyPayrollItems) {
      annualGross += item.grossEarnings;
      annualBasic += item.basic;
      annualHRA += item.hra;
      annualPT += item.pt;
      annualTDS += item.tds;
    }
  } else {
    annualGross =
      (annualSalaryStructure.basicMonthly +
        annualSalaryStructure.hraMonthly +
        annualSalaryStructure.conveyanceMonthly +
        annualSalaryStructure.specialAllowanceMonthly +
        annualSalaryStructure.medicalAllowanceMonthly +
        annualSalaryStructure.ltaMonthly) *
      12;
    annualBasic = annualSalaryStructure.basicMonthly * 12;
    annualHRA = annualSalaryStructure.hraMonthly * 12;
    annualPT = 2400;
  }

  // Compute Tax
  const taxResult = computeIndianIncomeTax({
    regime,
    financialYear,
    annualGrossSalary: annualGross,
    annualBasic,
    annualHRA,
    annualPT,
    declarations: taxDeclaration,
  });

  if (annualTDS === 0) {
    annualTDS = taxResult.totalAnnualTax;
  }

  // Part A quarterly breakdown
  const quarterlyAmount = Math.round(annualGross / 4);
  const quarterlyTds = Math.round(annualTDS / 4);

  const quarters = [
    {
      quarter: 'Q1 (Apr - Jun)',
      receiptNumbers: `REC-Q1-${employee.employeeCode}`,
      amountPaid: quarterlyAmount,
      taxDeducted: quarterlyTds,
      taxDeposited: quarterlyTds,
    },
    {
      quarter: 'Q2 (Jul - Sep)',
      receiptNumbers: `REC-Q2-${employee.employeeCode}`,
      amountPaid: quarterlyAmount,
      taxDeducted: quarterlyTds,
      taxDeposited: quarterlyTds,
    },
    {
      quarter: 'Q3 (Oct - Dec)',
      receiptNumbers: `REC-Q3-${employee.employeeCode}`,
      amountPaid: quarterlyAmount,
      taxDeducted: quarterlyTds,
      taxDeposited: quarterlyTds,
    },
    {
      quarter: 'Q4 (Jan - Mar)',
      receiptNumbers: `REC-Q4-${employee.employeeCode}`,
      amountPaid: annualGross - quarterlyAmount * 3,
      taxDeducted: annualTDS - quarterlyTds * 3,
      taxDeposited: annualTDS - quarterlyTds * 3,
    },
  ];

  const pan = employee.pan && employee.pan.length === 10 ? employee.pan : 'ABCDE1234F';

  return {
    certificateNumber: `F16-${financialYear.replace('-', '')}-${employee.employeeCode}`,
    financialYear,
    assessmentYear: `${Number.parseInt(financialYear.split('-')[0], 10) + 1}-${Number.parseInt(financialYear.split('-')[1], 10) + 1}`,
    employer: {
      name: 'MYLOTIC GROUP PRIVATE LIMITED',
      address: '100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066',
      pan: 'AABCM9876E',
      tan: 'BLRA12345E',
    },
    employee: {
      id: employee.id,
      code: employee.employeeCode,
      name: employee.name,
      pan,
      designation: employee.roleTitle,
      department: employee.department,
      address: 'Bengaluru, Karnataka, India',
    },
    partA: {
      quarterlyTds: quarters,
      totalTaxDeducted: annualTDS,
      totalTaxDeposited: annualTDS,
    },
    partB: {
      grossSalary: {
        salaryAsPerSection17_1: annualGross,
        valuePerquisitesSection17_2: 0,
        profitsInLieuSection17_3: 0,
        totalGross: annualGross,
      },
      exemptionsUnderSection10: {
        hraExemption: taxResult.exemptions.hraExemption,
        standardDeduction: taxResult.exemptions.standardDeduction,
        professionalTax: taxResult.exemptions.professionalTax,
        totalExemptions: taxResult.exemptions.totalExemptions,
      },
      totalSalaryAfterExemptions: taxResult.netSalaryAfterExemptions,
      deductionsUnderChapterVIA: {
        section80C: taxResult.deductions.section80C,
        section80D: taxResult.deductions.section80D,
        section80CCD_1B: taxResult.deductions.section80CCD_1B,
        section80G: taxResult.deductions.section80G,
        section80E: taxResult.deductions.section80E,
        section80TTA: taxResult.deductions.section80TTA,
        totalDeductions: taxResult.deductions.totalChapterVIA,
      },
      totalTaxableIncome: taxResult.taxableIncome,
      taxOnTotalIncome: taxResult.totalSlabTax,
      rebateUnder87A: taxResult.section87ARebate,
      taxPayable: taxResult.taxAfterRebate,
      surcharge: taxResult.surchargeAmount,
      healthAndEducationCess: taxResult.healthAndEducationCess,
      netTaxPayable: taxResult.totalAnnualTax,
      taxDeductedAtSource: annualTDS,
      refundOrPayableDue: taxResult.totalAnnualTax - annualTDS,
      regimeSelected: regime,
    },
    verification: {
      place: 'Bengaluru',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      signatoryName: 'Authorized Signatory',
      signatoryCapacity: 'Head of Payroll & Compliance',
    },
  };
}
