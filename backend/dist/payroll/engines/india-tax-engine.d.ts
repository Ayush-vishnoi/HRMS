import type { TaxComputationResult, TaxDeclarationInput, TaxRegime } from './types';
export declare function calculateHRAExemption(annualBasic: number, annualHRA: number, annualRentPaid: number, isMetro?: boolean): number;
export declare function computeIndianIncomeTax(params: {
    regime?: TaxRegime;
    financialYear?: string;
    annualGrossSalary: number;
    annualBasic: number;
    annualHRA: number;
    annualPT?: number;
    declarations?: Partial<TaxDeclarationInput>;
    priorTdsDeductedInYear?: number;
    priorMonthsElapsedInFY?: number;
}): TaxComputationResult;
