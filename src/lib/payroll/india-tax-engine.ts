import type { TaxComputationResult, TaxDeclarationInput, TaxRegime } from './types';

/**
 * Calculates Section 10(13A) House Rent Allowance Exemption (Old Regime Only)
 */
export function calculateHRAExemption(
  annualBasic: number,
  annualHRA: number,
  annualRentPaid: number,
  isMetro: boolean = true
): number {
  if (annualRentPaid <= 0 || annualHRA <= 0) return 0;

  // Condition 1: Actual HRA received
  const condition1 = annualHRA;

  // Condition 2: Rent paid minus 10% of basic salary
  const condition2 = Math.max(0, annualRentPaid - 0.10 * annualBasic);

  // Condition 3: 50% of basic (Metro: Delhi, Mumbai, Kolkata, Chennai, Bengaluru) or 40% of basic (Non-Metro)
  const condition3 = isMetro ? 0.50 * annualBasic : 0.40 * annualBasic;

  return Math.min(condition1, condition2, condition3);
}

/**
 * Main Indian Income Tax Engine supporting both Old and New Tax Regimes
 */
export function computeIndianIncomeTax(params: {
  regime?: TaxRegime;
  financialYear?: string;
  annualGrossSalary: number;
  annualBasic: number;
  annualHRA: number;
  annualPT?: number;
  declarations?: Partial<TaxDeclarationInput>;
  priorTdsDeductedInYear?: number;
  priorMonthsElapsedInFY?: number;
}): TaxComputationResult {
  const regime: TaxRegime = params.regime || params.declarations?.regime || 'New';
  const financialYear = params.financialYear || params.declarations?.financialYear || '2026-27';
  const annualGrossSalary = Math.max(0, params.annualGrossSalary);
  const annualBasic = Math.max(0, params.annualBasic);
  const annualHRA = Math.max(0, params.annualHRA);
  const annualPT = params.annualPT ?? 2400;
  const isMetro = params.declarations?.isMetroCity ?? true;

  const decl = params.declarations || {};

  // 1. EXEMPTIONS UNDER SECTION 10 & 16
  let standardDeduction = 0;
  let hraExemption = 0;
  let ptExemption = 0;
  let otherExemptions = 0;

  if (regime === 'New') {
    // New Tax Regime (Section 115BAC): ₹75,000 standard deduction (FY 2024-25 onwards)
    standardDeduction = Math.min(annualGrossSalary, 75000);
    hraExemption = 0; // Not allowed in New Regime
    ptExemption = 0; // Not allowed in New Regime
    otherExemptions = 0;
  } else {
    // Old Tax Regime
    standardDeduction = Math.min(annualGrossSalary, 50000);
    const rentPaid = Math.max(0, decl.hraExemptionRent || 0);
    hraExemption = calculateHRAExemption(annualBasic, annualHRA, rentPaid, isMetro);
    ptExemption = Math.min(2500, annualPT);
    otherExemptions = Math.max(0, decl.otherExemptions || 0);
  }

  const totalExemptions = standardDeduction + hraExemption + ptExemption + otherExemptions;
  const netSalaryAfterExemptions = Math.max(0, annualGrossSalary - totalExemptions);

  // 2. CHAPTER VI-A DEDUCTIONS & SECTION 24(B)
  let section80C = 0;
  let section80D = 0;
  let section80CCD_1B = 0;
  let section80G = 0;
  let section80E = 0;
  let section80TTA = 0;
  let homeLoanInterest = 0;

  if (regime === 'Old') {
    // Section 80C capped at ₹1,50,000
    section80C = Math.min(150000, Math.max(0, decl.section80C || 0));

    // Section 80D capped at ₹75,000 (Self ₹25k + Parents ₹50k)
    section80D = Math.min(75000, Math.max(0, decl.section80D || 0));

    // Section 80CCD(1B) NPS capped at ₹50,000
    section80CCD_1B = Math.min(50000, Math.max(0, decl.section80CCD_1B || 0));

    section80G = Math.max(0, decl.section80G || 0);
    section80E = Math.max(0, decl.section80E || 0);
    section80TTA = Math.min(10000, Math.max(0, decl.section80TTA || 0));

    // Section 24(b) Home loan interest loss capped at ₹2,00,000
    homeLoanInterest = Math.min(200000, Math.max(0, decl.homeLoanInterest || 0));
  }

  const totalChapterVIA = section80C + section80D + section80CCD_1B + section80G + section80E + section80TTA + homeLoanInterest;
  const taxableIncome = Math.max(0, netSalaryAfterExemptions - totalChapterVIA);

  // 3. TAX SLAB CALCULATION
  const slabBreakdown: TaxComputationResult['slabTaxBreakdown'] = [];
  let totalSlabTax = 0;

  if (regime === 'New') {
    // New Tax Regime Slabs (FY 2024-25 / 2025-26 / 2026-27):
    // 0 - 3,00,000: 0%
    // 3,00,001 - 7,00,000: 5%
    // 7,00,001 - 10,00,000: 10%
    // 10,00,001 - 12,00,000: 15%
    // 12,00,001 - 15,00,000: 20%
    // Above 15,00,000: 30%
    const newSlabs = [
      { min: 0, max: 300000, rate: 0, label: '₹0 - ₹3,00,000' },
      { min: 300000, max: 700000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000' },
      { min: 700000, max: 1000000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000' },
      { min: 1000000, max: 1200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000' },
      { min: 1200000, max: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000' },
      { min: 1500000, max: Number.POSITIVE_INFINITY, rate: 0.30, label: 'Above ₹15,00,000' },
    ];

    for (const slab of newSlabs) {
      if (taxableIncome > slab.min) {
        const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
        const taxInSlab = taxableInSlab * slab.rate;
        slabBreakdown.push({
          slabRange: slab.label,
          rate: slab.rate * 100,
          taxableAmountInSlab: taxableInSlab,
          taxAmount: taxInSlab,
        });
        totalSlabTax += taxInSlab;
      }
    }
  } else {
    // Old Tax Regime Slabs:
    // 0 - 2,50,000: 0%
    // 2,50,001 - 5,00,000: 5%
    // 5,00,001 - 10,00,000: 20%
    // Above 10,00,000: 30%
    const oldSlabs = [
      { min: 0, max: 250000, rate: 0, label: '₹0 - ₹2,50,000' },
      { min: 250000, max: 500000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000' },
      { min: 500000, max: 1000000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000' },
      { min: 1000000, max: Number.POSITIVE_INFINITY, rate: 0.30, label: 'Above ₹10,00,000' },
    ];

    for (const slab of oldSlabs) {
      if (taxableIncome > slab.min) {
        const taxableInSlab = Math.min(taxableIncome, slab.max) - slab.min;
        const taxInSlab = taxableInSlab * slab.rate;
        slabBreakdown.push({
          slabRange: slab.label,
          rate: slab.rate * 100,
          taxableAmountInSlab: taxableInSlab,
          taxAmount: taxInSlab,
        });
        totalSlabTax += taxInSlab;
      }
    }
  }

  // 4. SECTION 87A REBATE
  let section87ARebate = 0;
  if (regime === 'New' && taxableIncome <= 700000) {
    // New Regime: 100% tax rebate up to ₹25,000 if taxable income <= ₹7,00,000
    section87ARebate = Math.min(totalSlabTax, 25000);
  } else if (regime === 'Old' && taxableIncome <= 500000) {
    // Old Regime: 100% tax rebate up to ₹12,500 if taxable income <= ₹5,00,000
    section87ARebate = Math.min(totalSlabTax, 12500);
  }

  const taxAfterRebate = Math.max(0, totalSlabTax - section87ARebate);

  // 5. SURCHARGE
  let surchargeRate = 0;
  if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
    surchargeRate = 0.10;
  } else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
    surchargeRate = 0.15;
  } else if (taxableIncome > 20000000) {
    surchargeRate = 0.25;
  }
  const surchargeAmount = Math.round(taxAfterRebate * surchargeRate);

  // 6. HEALTH & EDUCATION CESS (4%)
  const healthAndEducationCess = Math.round((taxAfterRebate + surchargeAmount) * 0.04);
  const totalAnnualTax = Math.round(taxAfterRebate + surchargeAmount + healthAndEducationCess);

  // 7. PROJECTED MONTHLY TDS
  const priorTds = params.priorTdsDeductedInYear || 0;
  const elapsedMonths = Math.min(11, params.priorMonthsElapsedInFY || 0);
  const remainingMonths = Math.max(1, 12 - elapsedMonths);

  const remainingTaxDue = Math.max(0, totalAnnualTax - priorTds);
  const monthlyTdsProjected = Math.round(remainingTaxDue / remainingMonths);

  return {
    regime,
    financialYear,
    annualGrossSalary,
    exemptions: {
      hraExemption,
      standardDeduction,
      professionalTax: ptExemption,
      otherExemptions,
      totalExemptions,
    },
    netSalaryAfterExemptions,
    deductions: {
      section80C,
      section80D,
      section80CCD_1B,
      section80G,
      section80E,
      section80TTA,
      homeLoanInterest,
      totalChapterVIA,
    },
    taxableIncome,
    slabTaxBreakdown: slabBreakdown,
    totalSlabTax,
    section87ARebate,
    taxAfterRebate,
    surchargeAmount,
    healthAndEducationCess,
    totalAnnualTax,
    monthlyTdsProjected,
  };
}
