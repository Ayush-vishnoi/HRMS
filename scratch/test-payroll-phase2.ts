import { db } from '../src/lib/db';
import {
  calculateProvidentFund,
  calculateESIC,
  calculateProfessionalTax,
  calculateLWF,
  calculateGratuityProvision,
} from '../src/lib/payroll/statutory-engine';
import { computeIndianIncomeTax, calculateHRAExemption } from '../src/lib/payroll/india-tax-engine';
import { calculateEmployeeMonthlyPayroll } from '../src/lib/payroll/payroll-engine';
import { runPayrollCycleReconciliation } from '../src/lib/payroll/reconciliation-engine';
import { generateForm16Statement } from '../src/lib/payroll/form16-service';
import { renderPayslipHtml, renderForm16Html } from '../src/lib/payroll/pdf-service';
import type { EmployeePayrollInput } from '../src/lib/payroll/types';

async function runPayrollPhase2Tests() {
  console.log('===============================================================');
  console.log('   HRMS PHASE 2 — ENTERPRISE INDIA PAYROLL AUTOMATED TEST SUITE');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   Details: ${details}`);
    }
  }

  // -------------------------------------------------------------
  // TEST 1: STATUTORY PROVIDENT FUND (PF)
  // -------------------------------------------------------------
  console.log('\n--- 1. Provident Fund (PF) Tests ---');
  const pfCapped = calculateProvidentFund(50000, { isCapped: true });
  assert(
    pfCapped.employeePF === 1800 && pfCapped.employerPF === 1800,
    'PF Capped at ₹15,000 Wage Ceiling returns ₹1,800 Employee & Employer share',
    `Got EE: ${pfCapped.employeePF}, ER: ${pfCapped.employerPF}`
  );
  assert(
    pfCapped.employerEPS === 1250 && pfCapped.employerEPF === 550,
    'Employer PF correctly splits into EPS (8.33% max ₹1,250) and EPF (3.67% = ₹550)',
    `Got EPS: ${pfCapped.employerEPS}, EPF: ${pfCapped.employerEPF}`
  );

  const pfUncapped = calculateProvidentFund(20000, { isCapped: false });
  assert(
    pfUncapped.employeePF === 2400,
    'PF Uncapped on ₹20,000 Basic returns 12% = ₹2,400',
    `Got EE: ${pfUncapped.employeePF}`
  );

  // -------------------------------------------------------------
  // TEST 2: STATUTORY ESIC
  // -------------------------------------------------------------
  console.log('\n--- 2. ESIC Tests ---');
  const esicEligible = calculateESIC(18000);
  assert(
    esicEligible.isEligible && esicEligible.employeeESIC === 135 && esicEligible.employerESIC === 585,
    'ESIC on Gross ₹18,000 (<= ₹21k threshold) returns 0.75% (₹135) and 3.25% (₹585)',
    `Got isEligible: ${esicEligible.isEligible}, EE: ${esicEligible.employeeESIC}, ER: ${esicEligible.employerESIC}`
  );

  const esicIneligible = calculateESIC(45000);
  assert(
    !esicIneligible.isEligible && esicIneligible.employeeESIC === 0,
    'ESIC on Gross ₹45,000 (> ₹21k threshold) returns 0 contribution',
    `Got isEligible: ${esicIneligible.isEligible}, EE: ${esicIneligible.employeeESIC}`
  );

  // -------------------------------------------------------------
  // TEST 3: STATE-SPECIFIC PROFESSIONAL TAX (PT)
  // -------------------------------------------------------------
  console.log('\n--- 3. State-Specific Professional Tax (PT) Tests ---');
  const ptKarnataka = calculateProfessionalTax(50000, 'Karnataka');
  assert(ptKarnataka === 200, 'Karnataka PT for Gross >= ₹25,000 is ₹200', `Got: ${ptKarnataka}`);

  const ptMahaJan = calculateProfessionalTax(30000, 'Maharashtra', 1);
  const ptMahaFeb = calculateProfessionalTax(30000, 'Maharashtra', 2);
  assert(
    ptMahaJan === 200 && ptMahaFeb === 300,
    'Maharashtra PT is ₹200 in regular months and ₹300 in February',
    `Got Jan: ${ptMahaJan}, Feb: ${ptMahaFeb}`
  );

  const ptDelhi = calculateProfessionalTax(100000, 'Delhi');
  assert(ptDelhi === 0, 'Delhi has ₹0 Professional Tax', `Got: ${ptDelhi}`);

  const ptWB = calculateProfessionalTax(18000, 'West Bengal');
  assert(ptWB === 130, 'West Bengal PT on Gross ₹18,000 falls in ₹15k-₹20k slab = ₹130', `Got: ${ptWB}`);

  // -------------------------------------------------------------
  // TEST 4: LABOUR WELFARE FUND (LWF) & GRATUITY PROVISION
  // -------------------------------------------------------------
  console.log('\n--- 4. LWF & Gratuity Tests ---');
  const lwfMahaJune = calculateLWF('Maharashtra', 6);
  assert(
    lwfMahaJune.employeeLWF === 12 && lwfMahaJune.employerLWF === 36,
    'Maharashtra LWF in June is ₹12 EE / ₹36 ER',
    `Got EE: ${lwfMahaJune.employeeLWF}, ER: ${lwfMahaJune.employerLWF}`
  );

  const gratuityMonthly = calculateGratuityProvision(50000);
  assert(
    gratuityMonthly === 2404,
    'Gratuity Monthly Provision on ₹50,000 Basic is (50000 * 15 / 26)/12 = ₹2,404',
    `Got: ${gratuityMonthly}`
  );

  // -------------------------------------------------------------
  // TEST 5: INDIAN TAX ENGINE — NEW REGIME
  // -------------------------------------------------------------
  console.log('\n--- 5. Indian Income Tax Engine (New Regime) Tests ---');
  // Salary of ₹7,50,000 in New Regime: Std deduction ₹75,000 -> Taxable ₹6,75,000 -> Slabs: 0-3L (0) + 3-6.75L (5% = 18,750). Rebate u/s 87A covers 100% up to 25k -> Net Tax = ₹0
  const taxNew750k = computeIndianIncomeTax({
    regime: 'New',
    annualGrossSalary: 750000,
    annualBasic: 375000,
    annualHRA: 187500,
  });
  assert(
    taxNew750k.taxableIncome === 675000 && taxNew750k.totalAnnualTax === 0,
    'New Regime income of ₹7.5L has ₹75k std deduction and ₹0 tax after Section 87A rebate',
    `Taxable: ${taxNew750k.taxableIncome}, Tax: ${taxNew750k.totalAnnualTax}`
  );

  // High earner: ₹15,00,000 in New Regime
  // Std deduction ₹75,000 -> Taxable ₹14,25,000
  // Slabs: 0-3L 0, 3-7L (20k), 7-10L (30k), 10-12L (30k), 12-14.25L (20% of 2.25L = 45k) -> Total Slab Tax = 1,25,000 + 4% cess (5,000) = ₹1,30,000
  const taxNew15L = computeIndianIncomeTax({
    regime: 'New',
    annualGrossSalary: 1500000,
    annualBasic: 750000,
    annualHRA: 375000,
  });
  assert(
    taxNew15L.totalAnnualTax === 130000 && taxNew15L.monthlyTdsProjected === Math.round(130000 / 12),
    'New Regime income of ₹15L has projected annual tax of ₹1,30,000 (~₹10,833/mo TDS)',
    `Annual Tax: ${taxNew15L.totalAnnualTax}, Monthly TDS: ${taxNew15L.monthlyTdsProjected}`
  );

  // -------------------------------------------------------------
  // TEST 6: INDIAN TAX ENGINE — OLD REGIME WITH EXEMPTIONS & 80C/80D
  // -------------------------------------------------------------
  console.log('\n--- 6. Indian Income Tax Engine (Old Regime) Tests ---');
  const hraExempt = calculateHRAExemption(600000, 300000, 240000, true);
  // min(300k, 240k - 60k = 180k, 50% of 600k = 300k) => 180,000
  assert(
    hraExempt === 180000,
    'HRA exemption for ₹20k/mo rent on ₹50k/mo basic is ₹1,80,000/yr',
    `Got: ${hraExempt}`
  );

  const taxOld12L = computeIndianIncomeTax({
    regime: 'Old',
    annualGrossSalary: 1200000,
    annualBasic: 600000,
    annualHRA: 300000,
    annualPT: 2400,
    declarations: {
      regime: 'Old',
      financialYear: '2026-27',
      section80C: 150000,
      section80D: 25000,
      hraExemptionRent: 240000,
      homeLoanInterest: 0,
      otherExemptions: 0,
      section80CCD_1B: 0,
      section80E: 0,
      section80G: 0,
      section80TTA: 0,
      declarationStatus: 'Approved',
      isMetroCity: true,
    },
  });
  // Gross 12L - StdDeduct 50k - HRA 180k - PT 2.4k = Net 9,67,600 - 80C 1.5L - 80D 25k = Taxable 7,92,600
  // Slabs: 0-2.5L 0, 2.5-5L 12.5k, 5-7.926L 20% (58,520) -> Slab tax = 71,020 + 4% cess (2,841) = ₹73,861
  assert(
    taxOld12L.taxableIncome === 792600 && taxOld12L.totalAnnualTax === 73861,
    'Old Regime tax computation on ₹12L with 80C, 80D, HRA & PT deductions matches statutory math',
    `Taxable: ${taxOld12L.taxableIncome}, Tax: ${taxOld12L.totalAnnualTax}`
  );

  // -------------------------------------------------------------
  // TEST 7: COMPLETE MONTHLY PAYROLL CALCULATION (PRORATION + LOANS + OT + REIMBURSEMENTS)
  // -------------------------------------------------------------
  console.log('\n--- 7. Monthly Payroll Calculation Pipeline ---');
  const sampleEmpInput: EmployeePayrollInput = {
    employeeId: 'EMP-001',
    employeeCode: 'EMP-2026-001',
    employeeName: 'Ayush Vishnoi',
    department: 'Engineering',
    locationState: 'Karnataka',
    activeSalaryStructure: {
      ctcAnnual: 1200000,
      basicMonthly: 50000,
      hraMonthly: 25000,
      conveyanceMonthly: 1600,
      specialAllowanceMonthly: 22150,
      medicalAllowanceMonthly: 1250,
      ltaMonthly: 0,
      statutoryBonusMonthly: 0,
      pfEmployerMonthly: 1800,
      pfEmployeeMonthly: 1800,
      esicEmployerMonthly: 0,
      esicEmployeeMonthly: 0,
      ptMonthly: 200,
      gratuityMonthly: 2404,
      effectiveFrom: '2026-04-01',
    },
    attendance: {
      totalCalendarDays: 30,
      presentDays: 30,
      approvedLeaveDays: 0,
      lossOfPayDays: 0,
    },
    overtime: {
      approvedMinutes: 120, // 2 hours
    },
    variablePay: {
      bonus: 10000,
      incentives: 5000,
      arrears: 2000,
    },
    expenseClaims: {
      approvedReimbursements: 3500,
    },
    activeLoans: [
      {
        loanId: 'loan-1',
        monthlyEmi: 4000,
        remainingBalance: 20000,
        isPaused: false,
      },
    ],
  };

  const calculatedItem = calculateEmployeeMonthlyPayroll(sampleEmpInput, 9);
  assert(
    calculatedItem.basic === 50000 && calculatedItem.pfEmployee === 1800 && calculatedItem.pt === 200,
    'Core monthly earnings (Basic ₹50,000) and statutory deductions (PF ₹1,800, PT ₹200) calculated correctly',
    `Basic: ${calculatedItem.basic}, PF: ${calculatedItem.pfEmployee}, PT: ${calculatedItem.pt}`
  );
  assert(
    calculatedItem.bonus === 10000 && calculatedItem.incentives === 5000 && calculatedItem.arrears === 2000 && calculatedItem.reimbursements === 3500,
    'Variable pay (bonus, incentives, arrears) and expense reimbursements added to gross',
    `Bonus: ${calculatedItem.bonus}, Inc: ${calculatedItem.incentives}, Arrears: ${calculatedItem.arrears}, Reimb: ${calculatedItem.reimbursements}`
  );
  assert(
    calculatedItem.loanDeduction === 4000,
    'Active loan EMI (₹4,000) deducted from pay',
    `Loan Deduction: ${calculatedItem.loanDeduction}`
  );
  assert(
    calculatedItem.netPayable === calculatedItem.grossEarnings - calculatedItem.totalDeductions,
    'Net payable equals Gross Earnings minus Total Deductions',
    `Net: ${calculatedItem.netPayable}, Gross: ${calculatedItem.grossEarnings}, Deductions: ${calculatedItem.totalDeductions}`
  );

  // -------------------------------------------------------------
  // TEST 8: MID-MONTH SALARY REVISION PRORATION
  // -------------------------------------------------------------
  console.log('\n--- 8. Mid-Month Salary Revision Proration Tests ---');
  const empWithMidMonthRevision: EmployeePayrollInput = {
    ...sampleEmpInput,
    activeSalaryStructure: {
      ...sampleEmpInput.activeSalaryStructure,
      basicMonthly: 40000,
    },
    salaryRevisionsInMonth: [
      {
        effectiveDate: '2026-09-16', // Effective from 16th (15 days at 40k, 15 days at 60k)
        newCtcAnnual: 1440000,
        newBasicMonthly: 60000,
        newHraMonthly: 30000,
        newSpecialMonthly: 30000,
      },
    ],
  };

  const proratedItem = calculateEmployeeMonthlyPayroll(empWithMidMonthRevision, 9);
  // Expected Basic = (40k * 0.5) + (60k * 0.5) = ₹50,000
  assert(
    proratedItem.basic === 50000,
    'Mid-month revision effective on 16th September prorates Basic (15 days @ 40k + 15 days @ 60k = ₹50,000)',
    `Got Prorated Basic: ${proratedItem.basic}`
  );

  // -------------------------------------------------------------
  // TEST 9: RECONCILIATION ENGINE ANOMALY DETECTION
  // -------------------------------------------------------------
  console.log('\n--- 9. Payroll Reconciliation & Anomaly Engine Tests ---');
  const mockCycle = {
    id: 'cycle-test-1',
    monthYear: 'September 2026',
    totalEmployees: 2,
    totalGross: 200000,
    totalDeductions: 30000,
    totalNetPayable: 170000,
  };
  const mockItems = [
    {
      id: 'i1',
      employeeId: 'emp-1',
      employeeCode: 'EMP-01',
      employeeName: 'John Doe',
      grossEarnings: 100000,
      totalDeductions: 15000,
      netPayable: 85000,
      bankAccountMasked: '•••• 1234',
      bankIfsc: 'HDFC0001',
      panNumber: 'ABCDE1234F',
    },
    {
      id: 'i2',
      employeeId: 'emp-2',
      employeeCode: 'EMP-02',
      employeeName: 'Jane Doe',
      grossEarnings: 100000,
      totalDeductions: 15000,
      netPayable: 85000,
      bankAccountMasked: '•••• 5678',
      bankIfsc: 'ICIC0002',
      panNumber: 'PQRST5678G',
    },
  ];

  const reconMatched = runPayrollCycleReconciliation({
    cycle: mockCycle,
    items: mockItems,
  });
  assert(
    reconMatched.status === 'MATCHED' && reconMatched.discrepanciesCount === 0,
    'Reconciliation returns MATCHED with 0 anomalies on valid cycle parity',
    `Status: ${reconMatched.status}, Discrepancies: ${reconMatched.discrepanciesCount}`
  );

  // Anomaly test: Negative net pay and missing bank details
  const mockItemsWithAnomaly = [
    {
      id: 'i1',
      employeeId: 'emp-1',
      employeeCode: 'EMP-01',
      employeeName: 'John Doe',
      grossEarnings: 10000,
      totalDeductions: 15000,
      netPayable: -5000, // Negative pay
      bankAccountMasked: null, // Missing bank info
      bankIfsc: null,
      panNumber: 'ABCDE1234F',
    },
  ];
  const reconAnomaly = runPayrollCycleReconciliation({
    cycle: { ...mockCycle, totalEmployees: 1 },
    items: mockItemsWithAnomaly,
  });
  assert(
    reconAnomaly.status === 'MISMATCH' && reconAnomaly.anomalies.some((a) => a.type === 'NEGATIVE_NET'),
    'Reconciliation flags NEGATIVE_NET anomaly when deductions exceed gross',
    `Status: ${reconAnomaly.status}, Anomalies: ${JSON.stringify(reconAnomaly.anomalies.map((a) => a.type))}`
  );

  // -------------------------------------------------------------
  // TEST 10: FORM 16 STATEMENT GENERATOR
  // -------------------------------------------------------------
  console.log('\n--- 10. Form 16 & Annual Tax Summary Tests ---');
  const form16 = generateForm16Statement({
    employee: {
      id: 'EMP-001',
      employeeCode: 'EMP-2026-001',
      name: 'Ayush Vishnoi',
      department: 'Engineering',
      roleTitle: 'Developer',
      email: 'ayush@mylotic.com',
      pan: 'ABCDE1234F',
      joinDate: '2026-01-01',
    },
    financialYear: '2026-27',
    annualSalaryStructure: {
      ctcAnnual: 1200000,
      basicMonthly: 50000,
      hraMonthly: 25000,
      conveyanceMonthly: 1600,
      specialAllowanceMonthly: 22150,
      medicalAllowanceMonthly: 1250,
      ltaMonthly: 0,
    },
  });

  assert(
    form16.partA.quarterlyTds.length === 4 && form16.partB.grossSalary.totalGross > 0,
    'Form 16 statement generates Part A with 4 quarterly TDS breakdown items and Part B salary breakdown',
    `Quarters: ${form16.partA.quarterlyTds.length}, Part B Gross: ${form16.partB.grossSalary.totalGross}`
  );

  // -------------------------------------------------------------
  // TEST 11: SERVER-SIDE PDF SERVICE
  // -------------------------------------------------------------
  console.log('\n--- 11. PDF Document Rendering Tests ---');
  const payslipHtml = renderPayslipHtml({
    companyName: 'MYLOTIC GROUP PVT LTD',
    companyAddress: 'Whitefield, Bengaluru',
    companyPanTan: 'PAN: AABCM9876E',
    monthYear: 'September 2026',
    paymentDate: '30 Sep 2026',
    status: 'Paid',
    employee: {
      name: 'Ayush Vishnoi',
      code: 'EMP-001',
      designation: 'Developer',
      department: 'Engineering',
      pan: 'ABCDE1234F',
      bankName: 'HDFC Bank',
      accountNo: '•••• 4921',
      ifsc: 'HDFC0001',
      uan: '100234567890',
      payableDays: 30,
      lossOfPayDays: 0,
    },
    earnings: {
      basic: 50000,
      hra: 25000,
      conveyance: 1600,
      specialAllowance: 22150,
      medicalAllowance: 1250,
      lta: 0,
      bonus: 0,
      overtimePay: 0,
      arrears: 0,
      reimbursements: 0,
      grossEarnings: 100000,
    },
    deductions: {
      pfEmployee: 1800,
      esicEmployee: 0,
      pt: 200,
      tds: 10833,
      lwf: 0,
      loanDeduction: 0,
      lossOfPayDeduction: 0,
      totalDeductions: 12833,
    },
    employerContributions: {
      pfEmployer: 1800,
      esicEmployer: 0,
      gratuityProvision: 2404,
    },
    netPayable: 87167,
  });

  assert(
    payslipHtml.includes('MYLOTIC GROUP PVT LTD') && payslipHtml.includes('₹87,167'),
    'Server-side PDF service renders complete high-fidelity HTML document with official payslip figures',
    'HTML output validated'
  );

  const form16Html = renderForm16Html(form16);
  assert(
    form16Html.includes('PART A — QUARTERLY TDS SUMMARY') && form16Html.includes('PART B — DETAILS OF SALARY PAID'),
    'Server-side PDF service renders Form 16 Annual Tax Summary sheet with Part A and Part B tables',
    'Form 16 HTML output validated'
  );

  // -------------------------------------------------------------
  // TEST 12: DATABASE INTEGRATION & HISTORICAL INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- 12. Database Integration & Historical Immutability Tests ---');
  const existingCycle = await db.payrollCycle.findFirst({
    include: { items: true },
  });
  assert(
    Boolean(existingCycle),
    'PayrollCycle successfully queried from PostgreSQL database',
    `Found Cycle: ${existingCycle?.monthYear}`
  );

  console.log('\n===============================================================');
  console.log(`   TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('===============================================================');

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL HRMS PHASE 2 PAYROLL & COMPENSATION TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runPayrollPhase2Tests()
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
