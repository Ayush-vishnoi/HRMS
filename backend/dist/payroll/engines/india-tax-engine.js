"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHRAExemption = calculateHRAExemption;
exports.computeIndianIncomeTax = computeIndianIncomeTax;
function calculateHRAExemption(annualBasic, annualHRA, annualRentPaid, isMetro = true) {
    if (annualRentPaid <= 0 || annualHRA <= 0)
        return 0;
    const condition1 = annualHRA;
    const condition2 = Math.max(0, annualRentPaid - 0.10 * annualBasic);
    const condition3 = isMetro ? 0.50 * annualBasic : 0.40 * annualBasic;
    return Math.min(condition1, condition2, condition3);
}
function computeIndianIncomeTax(params) {
    const regime = params.regime || params.declarations?.regime || 'New';
    const financialYear = params.financialYear || params.declarations?.financialYear || '2026-27';
    const annualGrossSalary = Math.max(0, params.annualGrossSalary);
    const annualBasic = Math.max(0, params.annualBasic);
    const annualHRA = Math.max(0, params.annualHRA);
    const annualPT = params.annualPT ?? 2400;
    const isMetro = params.declarations?.isMetroCity ?? true;
    const decl = params.declarations || {};
    let standardDeduction = 0;
    let hraExemption = 0;
    let ptExemption = 0;
    let otherExemptions = 0;
    if (regime === 'New') {
        standardDeduction = Math.min(annualGrossSalary, 75000);
        hraExemption = 0;
        ptExemption = 0;
        otherExemptions = 0;
    }
    else {
        standardDeduction = Math.min(annualGrossSalary, 50000);
        const rentPaid = Math.max(0, decl.hraExemptionRent || 0);
        hraExemption = calculateHRAExemption(annualBasic, annualHRA, rentPaid, isMetro);
        ptExemption = Math.min(2500, annualPT);
        otherExemptions = Math.max(0, decl.otherExemptions || 0);
    }
    const totalExemptions = standardDeduction + hraExemption + ptExemption + otherExemptions;
    const netSalaryAfterExemptions = Math.max(0, annualGrossSalary - totalExemptions);
    let section80C = 0;
    let section80D = 0;
    let section80CCD_1B = 0;
    let section80G = 0;
    let section80E = 0;
    let section80TTA = 0;
    let homeLoanInterest = 0;
    if (regime === 'Old') {
        section80C = Math.min(150000, Math.max(0, decl.section80C || 0));
        section80D = Math.min(75000, Math.max(0, decl.section80D || 0));
        section80CCD_1B = Math.min(50000, Math.max(0, decl.section80CCD_1B || 0));
        section80G = Math.max(0, decl.section80G || 0);
        section80E = Math.max(0, decl.section80E || 0);
        section80TTA = Math.min(10000, Math.max(0, decl.section80TTA || 0));
        homeLoanInterest = Math.min(200000, Math.max(0, decl.homeLoanInterest || 0));
    }
    const totalChapterVIA = section80C + section80D + section80CCD_1B + section80G + section80E + section80TTA + homeLoanInterest;
    const taxableIncome = Math.max(0, netSalaryAfterExemptions - totalChapterVIA);
    const slabBreakdown = [];
    let totalSlabTax = 0;
    if (regime === 'New') {
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
    }
    else {
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
    let section87ARebate = 0;
    if (regime === 'New' && taxableIncome <= 700000) {
        section87ARebate = Math.min(totalSlabTax, 25000);
    }
    else if (regime === 'Old' && taxableIncome <= 500000) {
        section87ARebate = Math.min(totalSlabTax, 12500);
    }
    const taxAfterRebate = Math.max(0, totalSlabTax - section87ARebate);
    let surchargeRate = 0;
    if (taxableIncome > 5000000 && taxableIncome <= 10000000) {
        surchargeRate = 0.10;
    }
    else if (taxableIncome > 10000000 && taxableIncome <= 20000000) {
        surchargeRate = 0.15;
    }
    else if (taxableIncome > 20000000) {
        surchargeRate = 0.25;
    }
    const surchargeAmount = Math.round(taxAfterRebate * surchargeRate);
    const healthAndEducationCess = Math.round((taxAfterRebate + surchargeAmount) * 0.04);
    const totalAnnualTax = Math.round(taxAfterRebate + surchargeAmount + healthAndEducationCess);
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
//# sourceMappingURL=india-tax-engine.js.map