"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPayrollCycleReconciliation = runPayrollCycleReconciliation;
function runPayrollCycleReconciliation(params) {
    const { cycle, items, payslips = [], totalDisbursedAmount } = params;
    const anomalies = [];
    let sumGross = 0;
    let sumDeductions = 0;
    let sumNet = 0;
    const seenEmployeeIds = new Set();
    for (const item of items) {
        sumGross += item.grossEarnings;
        sumDeductions += item.totalDeductions;
        sumNet += item.netPayable;
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
        if (item.netPayable <= 0) {
            anomalies.push({
                type: 'NEGATIVE_NET',
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                description: `Net payable is zero or negative (₹${item.netPayable}) due to high deductions (Gross: ₹${item.grossEarnings}, Deductions: ₹${item.totalDeductions}).`,
                severity: 'HIGH',
            });
        }
        if (!item.bankAccountMasked || !item.bankIfsc) {
            anomalies.push({
                type: 'MISSING_BANK_INFO',
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                description: `Missing bank account or IFSC code for disbursement.`,
                severity: 'MEDIUM',
            });
        }
        if (!item.panNumber || item.panNumber.includes('XXXX')) {
            anomalies.push({
                type: 'MISSING_PAN',
                employeeId: item.employeeId,
                employeeName: item.employeeName,
                description: `Missing verified PAN number for statutory TDS compliance.`,
                severity: 'LOW',
            });
        }
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
    if (items.length !== cycle.totalEmployees) {
        anomalies.push({
            type: 'CALCULATION_MISMATCH',
            description: `Employee count mismatch: Cycle specifies ${cycle.totalEmployees} employees, but ${items.length} items exist.`,
            severity: 'HIGH',
        });
    }
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
    const hasHighSeverity = anomalies.some((a) => a.severity === 'HIGH');
    const hasMediumSeverity = anomalies.some((a) => a.severity === 'MEDIUM');
    let status = 'MATCHED';
    if (hasHighSeverity) {
        status = 'MISMATCH';
    }
    else if (hasMediumSeverity || anomalies.length > 0) {
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
//# sourceMappingURL=reconciliation-engine.js.map