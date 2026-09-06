import type { Form16StatementData } from './types';
export interface PayslipPdfData {
    companyName: string;
    companyAddress: string;
    companyPanTan: string;
    monthYear: string;
    paymentDate: string;
    status: string;
    employee: {
        name: string;
        code: string;
        designation: string;
        department: string;
        pan: string;
        bankName: string;
        accountNo: string;
        ifsc: string;
        uan: string;
        payableDays: number;
        lossOfPayDays: number;
    };
    earnings: {
        basic: number;
        hra: number;
        conveyance: number;
        specialAllowance: number;
        medicalAllowance: number;
        lta: number;
        bonus: number;
        overtimePay: number;
        arrears: number;
        reimbursements: number;
        grossEarnings: number;
    };
    deductions: {
        pfEmployee: number;
        esicEmployee: number;
        pt: number;
        tds: number;
        lwf: number;
        loanDeduction: number;
        lossOfPayDeduction: number;
        totalDeductions: number;
    };
    employerContributions: {
        pfEmployer: number;
        esicEmployer: number;
        gratuityProvision: number;
    };
    netPayable: number;
    ytd?: {
        ytdGross: number;
        ytdTax: number;
        ytdPf: number;
    };
}
export declare function renderPayslipHtml(data: PayslipPdfData): string;
export declare function renderForm16Html(data: Form16StatementData): string;
