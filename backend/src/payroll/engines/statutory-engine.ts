import type { StatutoryRuleConfig } from './types';

export const DEFAULT_STATUTORY_CONFIG: StatutoryRuleConfig = {
  pf: {
    employeeRate: 0.12,
    employerRate: 0.12,
    wageCeilingMonthly: 15000,
    isCapped: true, // ₹1,800 max when capped at ₹15,000
    adminChargeRate: 0.005,
    edliRate: 0.005,
  },
  esic: {
    wageThresholdMonthly: 21000,
    employeeRate: 0.0075, // 0.75%
    employerRate: 0.0325, // 3.25%
  },
  pt: {
    stateSlabs: {
      Karnataka: [
        { minMonthlyGross: 0, maxMonthlyGross: 24999, monthlyTax: 0 },
        { minMonthlyGross: 25000, maxMonthlyGross: null, monthlyTax: 200 },
      ],
      Maharashtra: [
        { minMonthlyGross: 0, maxMonthlyGross: 10000, monthlyTax: 0 },
        { minMonthlyGross: 10001, maxMonthlyGross: null, monthlyTax: 200, februaryTax: 300 },
      ],
      'West Bengal': [
        { minMonthlyGross: 0, maxMonthlyGross: 10000, monthlyTax: 0 },
        { minMonthlyGross: 10001, maxMonthlyGross: 15000, monthlyTax: 110 },
        { minMonthlyGross: 15001, maxMonthlyGross: 20000, monthlyTax: 130 },
        { minMonthlyGross: 20001, maxMonthlyGross: 40000, monthlyTax: 150 },
        { minMonthlyGross: 40001, maxMonthlyGross: null, monthlyTax: 200 },
      ],
      Gujarat: [
        { minMonthlyGross: 0, maxMonthlyGross: 12000, monthlyTax: 0 },
        { minMonthlyGross: 12001, maxMonthlyGross: null, monthlyTax: 200 },
      ],
      Telangana: [
        { minMonthlyGross: 0, maxMonthlyGross: 15000, monthlyTax: 0 },
        { minMonthlyGross: 15001, maxMonthlyGross: 20000, monthlyTax: 150 },
        { minMonthlyGross: 20001, maxMonthlyGross: null, monthlyTax: 200 },
      ],
      'Andhra Pradesh': [
        { minMonthlyGross: 0, maxMonthlyGross: 15000, monthlyTax: 0 },
        { minMonthlyGross: 15001, maxMonthlyGross: 20000, monthlyTax: 150 },
        { minMonthlyGross: 20001, maxMonthlyGross: null, monthlyTax: 200 },
      ],
      'Tamil Nadu': [
        { minMonthlyGross: 0, maxMonthlyGross: 21000, monthlyTax: 0 },
        { minMonthlyGross: 21001, maxMonthlyGross: null, monthlyTax: 208 },
      ],
      Delhi: [
        { minMonthlyGross: 0, maxMonthlyGross: null, monthlyTax: 0 },
      ],
      Haryana: [
        { minMonthlyGross: 0, maxMonthlyGross: null, monthlyTax: 0 },
      ],
    },
  },
  lwf: {
    stateRates: {
      Maharashtra: {
        employeeMonthly: 12,
        employerMonthly: 36,
        frequency: 'SemiAnnual',
        deductionMonths: [6, 12],
      },
      Karnataka: {
        employeeMonthly: 20,
        employerMonthly: 40,
        frequency: 'Annual',
        deductionMonths: [12],
      },
      Delhi: {
        employeeMonthly: 1, // Rounded from 0.75
        employerMonthly: 3, // Rounded from 2.25
        frequency: 'Monthly',
      },
      Gujarat: {
        employeeMonthly: 3,
        employerMonthly: 6,
        frequency: 'SemiAnnual',
        deductionMonths: [6, 12],
      },
    },
  },
  gratuity: {
    eligibilityYears: 5,
    annualProvisionFactor: (15 / 26) / 12, // ~0.0480769
  },
};

/**
 * Calculates Employee & Employer Provident Fund contributions
 */
export function calculateProvidentFund(
  basicMonthly: number,
  options?: {
    isCapped?: boolean;
    wageCeiling?: number;
    employeeRate?: number;
    employerRate?: number;
  }
): {
  employeePF: number;
  employerPF: number;
  employerEPS: number;
  employerEPF: number;
  pfWageBasis: number;
} {
  const isCapped = options?.isCapped ?? DEFAULT_STATUTORY_CONFIG.pf.isCapped;
  const wageCeiling = options?.wageCeiling ?? DEFAULT_STATUTORY_CONFIG.pf.wageCeilingMonthly;
  const employeeRate = options?.employeeRate ?? DEFAULT_STATUTORY_CONFIG.pf.employeeRate;
  const employerRate = options?.employerRate ?? DEFAULT_STATUTORY_CONFIG.pf.employerRate;

  const pfWageBasis = isCapped ? Math.min(basicMonthly, wageCeiling) : basicMonthly;

  const employeePF = Math.round(pfWageBasis * employeeRate);
  
  // Employer split: EPS 8.33% capped at ₹15,000 wage ceiling (max ₹1,250), EPF is balance (3.67% or uncapped balance)
  const epsWage = Math.min(basicMonthly, 15000);
  const employerEPS = Math.round(epsWage * (8.33 / 100));
  const employerTotal = Math.round(pfWageBasis * employerRate);
  const employerEPF = Math.max(0, employerTotal - employerEPS);

  return {
    employeePF,
    employerPF: employerTotal,
    employerEPS,
    employerEPF,
    pfWageBasis,
  };
}

/**
 * Calculates ESIC (Employee State Insurance) contribution
 */
export function calculateESIC(
  grossMonthly: number,
  options?: {
    threshold?: number;
    employeeRate?: number;
    employerRate?: number;
  }
): {
  isEligible: boolean;
  employeeESIC: number;
  employerESIC: number;
} {
  const threshold = options?.threshold ?? DEFAULT_STATUTORY_CONFIG.esic.wageThresholdMonthly;
  const employeeRate = options?.employeeRate ?? DEFAULT_STATUTORY_CONFIG.esic.employeeRate;
  const employerRate = options?.employerRate ?? DEFAULT_STATUTORY_CONFIG.esic.employerRate;

  if (grossMonthly > threshold) {
    return {
      isEligible: false,
      employeeESIC: 0,
      employerESIC: 0,
    };
  }

  const employeeESIC = Math.ceil(grossMonthly * employeeRate);
  const employerESIC = Math.ceil(grossMonthly * employerRate);

  return {
    isEligible: true,
    employeeESIC,
    employerESIC,
  };
}

/**
 * Calculates State-specific Professional Tax (PT)
 */
export function calculateProfessionalTax(
  grossMonthly: number,
  state: string = 'Karnataka',
  monthIndex: number = 1 // 1 for Jan, 2 for Feb, etc.
): number {
  const normalizedState = Object.keys(DEFAULT_STATUTORY_CONFIG.pt.stateSlabs).find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  ) || 'Karnataka';

  const slabs = DEFAULT_STATUTORY_CONFIG.pt.stateSlabs[normalizedState];
  if (!slabs || slabs.length === 0) {
    // Default fallback
    return grossMonthly >= 15000 ? 200 : 0;
  }

  for (const slab of slabs) {
    const min = slab.minMonthlyGross;
    const max = slab.maxMonthlyGross ?? Number.POSITIVE_INFINITY;
    if (grossMonthly >= min && grossMonthly <= max) {
      if (monthIndex === 2 && slab.februaryTax !== undefined) {
        return slab.februaryTax;
      }
      return slab.monthlyTax;
    }
  }

  return 0;
}

/**
 * Calculates State-specific Labour Welfare Fund (LWF)
 */
export function calculateLWF(
  state: string = 'Karnataka',
  monthIndex: number = 1
): {
  employeeLWF: number;
  employerLWF: number;
} {
  const normalizedState = Object.keys(DEFAULT_STATUTORY_CONFIG.lwf.stateRates).find(
    (s) => s.toLowerCase() === state.trim().toLowerCase()
  );

  if (!normalizedState) {
    return { employeeLWF: 0, employerLWF: 0 };
  }

  const rule = DEFAULT_STATUTORY_CONFIG.lwf.stateRates[normalizedState];
  if (rule.frequency === 'Monthly') {
    return {
      employeeLWF: rule.employeeMonthly,
      employerLWF: rule.employerMonthly,
    };
  }

  if (rule.deductionMonths && rule.deductionMonths.includes(monthIndex)) {
    return {
      employeeLWF: rule.employeeMonthly,
      employerLWF: rule.employerMonthly,
    };
  }

  return { employeeLWF: 0, employerLWF: 0 };
}

/**
 * Calculates Monthly Employer Gratuity Provision
 */
export function calculateGratuityProvision(basicMonthly: number): number {
  return Math.round(basicMonthly * DEFAULT_STATUTORY_CONFIG.gratuity.annualProvisionFactor);
}
