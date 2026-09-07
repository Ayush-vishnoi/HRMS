export interface SalaryComponentMetadata {
    code: string;
    name: string;
    type: 'Earning' | 'Deduction' | 'Statutory' | 'Reimbursement';
    calculationMethod: 'Fixed' | 'PercentageOfBasic' | 'PercentageOfGross' | 'Formula';
    formulaExpression: string;
    isTaxable: boolean;
    isStatutory: boolean;
    isEncashable: boolean;
    isPartCTC: boolean;
    isActive: boolean;
    effectiveFrom: string;
}
export declare const DEFAULT_SALARY_COMPONENTS: SalaryComponentMetadata[];
