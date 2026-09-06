import type { ReconciliationSummary } from './types';

export function runPayrollCycleReconciliation(params: {
  cycle: {
    id: string;
    monthYear: string;
    totalEmployees: number;
    totalGross: number;
    totalDeductions: number;
    totalNetPayable: number;
  };
  items: Array<{
    id: string;
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    grossEarnings: number;
    totalDeductions: number;
    netPayable: number;
    bankAccountMasked?: string | null;
    bankIfsc?: string | null;
    panNumber?: string | null;
  }>;
  payslips?: Array<{
    employeeId: string;
    netPayable: number;
  }>;
  totalDisbursedAmount?: number;
}): ReconciliationSummary {
  const { cycle, items, payslips = [], totalDisbursedAmount } = params;

  const anomalies: ReconciliationSummary['anomalies'] = [];

  let sumGross = 0;
  let sumDeductions = 0;
  let sumNet = 0;

  const seenEmployeeIds = new Set<string>();

  for (const item of items) {
    sumGross += item.grossEarnings;
    sumDeductions += item.totalDeductions;
    sumNet += item.netPayable;

    // Check 1: Duplicate employee
    if (seenEmployeeIds.has(item.employeeId)) {
      anomalies.push({
        type: 'DUPLICATE_ENTRY',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        description: `Duplicate payroll record found for employee ${item.employeeCode} (${item.employeeName}).`,
        severity: 'HIGH',
      });
    }
    seenEmployeeIds.add(item.employeeId);

    // Check 2: Negative or zero net salary
    if (item.netPayable <= 0) {
      anomalies.push({
        type: 'NEGATIVE_NET',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        description: `Net payable is zero or negative (₹${item.netPayable}) due to high deductions (Gross: ₹${item.grossEarnings}, Deductions: ₹${item.totalDeductions}).`,
        severity: 'HIGH',
      });
    }

    // Check 3: Missing Bank Details
    if (!item.bankAccountMasked || !item.bankIfsc) {
      anomalies.push({
        type: 'MISSING_BANK_INFO',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        description: `Missing bank account or IFSC code for disbursement.`,
        severity: 'MEDIUM',
      });
    }

    // Check 4: Missing PAN
    if (!item.panNumber || item.panNumber.includes('XXXX')) {
      anomalies.push({
        type: 'MISSING_PAN',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        description: `Missing verified PAN number for statutory TDS compliance.`,
        severity: 'LOW',
      });
    }

    // Check 5: Total deductions greater than gross
    if (item.totalDeductions > item.grossEarnings) {
      anomalies.push({
        type: 'CALCULATION_MISMATCH',
        employeeId: item.employeeId,
        employeeName: item.employeeName,
        description: `Total deductions (₹${item.totalDeductions}) exceed gross earnings (₹${item.grossEarnings}).`,
        severity: 'HIGH',
      });
    }
  }

  // Check 6: Item count vs Cycle header
  if (items.length !== cycle.totalEmployees) {
    anomalies.push({
      type: 'CALCULATION_MISMATCH',
      description: `Employee count mismatch: Cycle specifies ${cycle.totalEmployees} employees, but ${items.length} items exist.`,
      severity: 'HIGH',
    });
  }

  // Check 7: Gross / Deductions / Net sums vs Cycle header
  const grossDiff = Math.abs(sumGross - cycle.totalGross);
  const deductionDiff = Math.abs(sumDeductions - cycle.totalDeductions);
  const netDiff = Math.abs(sumNet - cycle.totalNetPayable);

  if (grossDiff > 1 || deductionDiff > 1 || netDiff > 1) {
    anomalies.push({
      type: 'CALCULATION_MISMATCH',
      description: `Header vs Line-item variance detected: Gross diff ₹${grossDiff}, Deduction diff ₹${deductionDiff}, Net diff ₹${netDiff}.`,
      severity: 'HIGH',
    });
  }

  // Check 8: Payslip parity
  if (payslips.length > 0) {
    if (payslips.length !== items.length) {
      anomalies.push({
        type: 'CALCULATION_MISMATCH',
        description: `Generated payslip count (${payslips.length}) does not match cycle items (${items.length}).`,
        severity: 'HIGH',
      });
    }
    const payslipSum = payslips.reduce((s, p) => s + p.netPayable, 0);
    if (Math.abs(payslipSum - sumNet) > 1) {
      anomalies.push({
        type: 'CALCULATION_MISMATCH',
        description: `Total net payable in payslips (₹${payslipSum}) does not match cycle net (₹${sumNet}).`,
        severity: 'HIGH',
      });
    }
  }

  // Determine overall status
  const hasHighSeverity = anomalies.some((a) => a.severity === 'HIGH');
  const hasMediumSeverity = anomalies.some((a) => a.severity === 'MEDIUM');

  let status: ReconciliationSummary['status'] = 'MATCHED';
  if (hasHighSeverity) {
    status = 'MISMATCH';
  } else if (hasMediumSeverity || anomalies.length > 0) {
    status = 'REQUIRES_REVIEW';
  }

  return {
    cycleId: cycle.id,
    monthYear: cycle.monthYear,
    status,
    totalEmployees: items.length,
    totalGross: sumGross,
    totalDeductions: sumDeductions,
    totalNet: sumNet,
    totalDisbursed: totalDisbursedAmount ?? sumNet,
    discrepanciesCount: anomalies.length,
    anomalies,
  };
}
