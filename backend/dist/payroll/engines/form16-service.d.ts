import type { Form16StatementData, TaxDeclarationInput } from './types';
export declare function generateForm16Statement(params: {
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
    financialYear: string;
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
}): Form16StatementData;
