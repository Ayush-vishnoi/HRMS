import type { ReconciliationSummary } from './types';
export declare function runPayrollCycleReconciliation(params: {
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
}): ReconciliationSummary;
