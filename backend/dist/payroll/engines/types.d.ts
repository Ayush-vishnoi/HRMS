export type TaxRegime = 'Old' | 'New';
export type SalaryComponentType = 'Earning' | 'Deduction' | 'Statutory' | 'Reimbursement';
export type CalculationMethod = 'Fixed' | 'PercentageOfBasic' | 'PercentageOfGross' | 'Formula';
export interface SalaryComponentMetadata {
    code: string;
    name: string;
    type: SalaryComponentType;
    calculationMethod: CalculationMethod;
    formulaExpression?: string;
    isTaxable: boolean;
    isStatutory: boolean;
    isEncashable: boolean;
    isPartCTC: boolean;
    isActive: boolean;
    effectiveFrom: string;
}
export interface StatePTSlab {
    minMonthlyGross: number;
    maxMonthlyGross: number | null;
    monthlyTax: number;
    februaryTax?: number;
}
export interface StatutoryRuleConfig {
    pf: {
        employeeRate: number;
        employerRate: number;
        wageCeilingMonthly: number;
        isCapped: boolean;
        adminChargeRate: number;
        edliRate: number;
    };
    esic: {
        wageThresholdMonthly: number;
        employeeRate: number;
        employerRate: number;
    };
    pt: {
        stateSlabs: Record<string, StatePTSlab[]>;
    };
    lwf: {
        stateRates: Record<string, {
            employeeMonthly: number;
            employerMonthly: number;
            frequency: 'Monthly' | 'SemiAnnual' | 'Annual';
            deductionMonths?: number[];
        }>;
    };
    gratuity: {
        eligibilityYears: number;
        annualProvisionFactor: number;
    };
}
export interface TaxDeclarationInput {
    regime: TaxRegime;
    financialYear: string;
    section80C: number;
    section80D: number;
    section80G: number;
    section80CCD_1B: number;
    section80E: number;
    section80TTA: number;
    hraExemptionRent: number;
    homeLoanInterest: number;
    otherExemptions: number;
    declarationStatus: string;
    isMetroCity?: boolean;
}
export interface TaxComputationResult {
    regime: TaxRegime;
    financialYear: string;
    annualGrossSalary: number;
    exemptions: {
        hraExemption: number;
        standardDeduction: number;
        professionalTax: number;
        otherExemptions: number;
        totalExemptions: number;
    };
    netSalaryAfterExemptions: number;
    deductions: {
        section80C: number;
        section80D: number;
        section80CCD_1B: number;
        section80G: number;
        section80E: number;
        section80TTA: number;
        homeLoanInterest: number;
        totalChapterVIA: number;
    };
    taxableIncome: number;
    slabTaxBreakdown: Array<{
        slabRange: string;
        rate: number;
        taxableAmountInSlab: number;
        taxAmount: number;
    }>;
    totalSlabTax: number;
    section87ARebate: number;
    taxAfterRebate: number;
    surchargeAmount: number;
    healthAndEducationCess: number;
    totalAnnualTax: number;
    monthlyTdsProjected: number;
}
export interface EmployeePayrollInput {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    designation?: string;
    locationState?: string;
    isMetro?: boolean;
    joinDate?: string;
    panNumber?: string;
    bankAccountMasked?: string;
    bankIfsc?: string;
    activeSalaryStructure: {
        ctcAnnual: number;
        basicMonthly: number;
        hraMonthly: number;
        conveyanceMonthly: number;
        specialAllowanceMonthly: number;
        medicalAllowanceMonthly: number;
        ltaMonthly: number;
        statutoryBonusMonthly: number;
        pfEmployerMonthly: number;
        pfEmployeeMonthly: number;
        esicEmployerMonthly: number;
        esicEmployeeMonthly: number;
        ptMonthly: number;
        gratuityMonthly: number;
        effectiveFrom: string;
    };
    salaryRevisionsInMonth?: Array<{
        effectiveDate: string;
        newCtcAnnual: number;
        newBasicMonthly: number;
        newHraMonthly: number;
        newSpecialMonthly: number;
    }>;
    attendance: {
        totalCalendarDays: number;
        presentDays: number;
        approvedLeaveDays: number;
        lossOfPayDays: number;
    };
    overtime: {
        approvedMinutes: number;
        hourlyRate?: number;
    };
    variablePay: {
        bonus: number;
        incentives: number;
        arrears: number;
    };
    expenseClaims: {
        approvedReimbursements: number;
    };
    activeLoans: Array<{
        loanId: string;
        monthlyEmi: number;
        remainingBalance: number;
        isPaused?: boolean;
    }>;
    taxDeclaration?: TaxDeclarationInput;
    priorTdsDeductedInYear?: number;
    priorMonthsElapsedInFY?: number;
}
export interface CalculatedPayrollItem {
    employeeId: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    payableDays: number;
    lossOfPayDays: number;
    lossOfPayDeduction: number;
    basic: number;
    hra: number;
    conveyance: number;
    specialAllowance: number;
    medicalAllowance: number;
    lta: number;
    bonus: number;
    incentives: number;
    overtimePay: number;
    arrears: number;
    reimbursements: number;
    grossEarnings: number;
    pfEmployee: number;
    pfEmployer: number;
    esicEmployee: number;
    esicEmployer: number;
    pt: number;
    tds: number;
    lwf: number;
    loanDeduction: number;
    otherDeductions: number;
    gratuityProvision: number;
    totalDeductions: number;
    netPayable: number;
    taxRegime: TaxRegime;
    bankAccountMasked?: string;
    bankIfsc?: string;
    panNumber?: string;
    calculationSnapshotJson: string;
}
export interface ReconciliationSummary {
    cycleId: string;
    monthYear: string;
    status: 'MATCHED' | 'MISMATCH' | 'REQUIRES_REVIEW';
    totalEmployees: number;
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalDisbursed: number;
    discrepanciesCount: number;
    anomalies: Array<{
        type: 'NEGATIVE_NET' | 'MISSING_BANK_INFO' | 'MISSING_PAN' | 'DUPLICATE_ENTRY' | 'CALCULATION_MISMATCH' | 'HIGH_VARIANCE';
        employeeId?: string;
        employeeName?: string;
        description: string;
        severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
}
export interface Form16StatementData {
    certificateNumber: string;
    financialYear: string;
    assessmentYear: string;
    employer: {
        name: string;
        address: string;
        pan: string;
        tan: string;
    };
    employee: {
        id: string;
        code: string;
        name: string;
        pan: string;
        designation: string;
        department: string;
        address?: string;
    };
    partA: {
        quarterlyTds: Array<{
            quarter: string;
            receiptNumbers: string;
            amountPaid: number;
            taxDeducted: number;
            taxDeposited: number;
        }>;
        totalTaxDeducted: number;
        totalTaxDeposited: number;
    };
    partB: {
        grossSalary: {
            salaryAsPerSection17_1: number;
            valuePerquisitesSection17_2: number;
            profitsInLieuSection17_3: number;
            totalGross: number;
        };
        exemptionsUnderSection10: {
            hraExemption: number;
            standardDeduction: number;
            professionalTax: number;
            totalExemptions: number;
        };
        totalSalaryAfterExemptions: number;
        deductionsUnderChapterVIA: {
            section80C: number;
            section80D: number;
            section80CCD_1B: number;
            section80G: number;
            section80E: number;
            section80TTA: number;
            totalDeductions: number;
        };
        totalTaxableIncome: number;
        taxOnTotalIncome: number;
        rebateUnder87A: number;
        taxPayable: number;
        surcharge: number;
        healthAndEducationCess: number;
        netTaxPayable: number;
        taxDeductedAtSource: number;
        refundOrPayableDue: number;
        regimeSelected: TaxRegime;
    };
    verification: {
        place: string;
        date: string;
        signatoryName: string;
        signatoryCapacity: string;
    };
}
