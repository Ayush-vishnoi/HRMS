import type { StatutoryRuleConfig } from './types';
export declare const DEFAULT_STATUTORY_CONFIG: StatutoryRuleConfig;
export declare function calculateProvidentFund(basicMonthly: number, options?: {
    isCapped?: boolean;
    wageCeiling?: number;
    employeeRate?: number;
    employerRate?: number;
}): {
    employeePF: number;
    employerPF: number;
    employerEPS: number;
    employerEPF: number;
    pfWageBasis: number;
};
export declare function calculateESIC(grossMonthly: number, options?: {
    threshold?: number;
    employeeRate?: number;
    employerRate?: number;
}): {
    isEligible: boolean;
    employeeESIC: number;
    employerESIC: number;
};
export declare function calculateProfessionalTax(grossMonthly: number, state?: string, monthIndex?: number): number;
export declare function calculateLWF(state?: string, monthIndex?: number): {
    employeeLWF: number;
    employerLWF: number;
};
export declare function calculateGratuityProvision(basicMonthly: number): number;
