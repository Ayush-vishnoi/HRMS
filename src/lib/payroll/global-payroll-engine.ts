import type { CalculatedPayrollItem, EmployeePayrollInput } from './types';
import { calculateEmployeeMonthlyPayroll } from './payroll-engine';

export interface CountryPayrollEngine {
  countryCode: string;
  countryName: string;
  currency: string;
  isStatutoryActive: boolean;
  calculate(input: EmployeePayrollInput, monthIndex?: number): CalculatedPayrollItem;
}

export class IndiaPayrollEngine implements CountryPayrollEngine {
  countryCode = 'IN';
  countryName = 'India';
  currency = 'INR';
  isStatutoryActive = true;

  calculate(input: EmployeePayrollInput, monthIndex: number = 1): CalculatedPayrollItem {
    return calculateEmployeeMonthlyPayroll(input, monthIndex);
  }
}

export class FutureCountryPayrollEngineStub implements CountryPayrollEngine {
  countryCode: string;
  countryName: string;
  currency: string;
  isStatutoryActive = false;

  constructor(code: string, name: string, currency: string) {
    this.countryCode = code;
    this.countryName = name;
    this.currency = currency;
  }

  calculate(input: EmployeePayrollInput): CalculatedPayrollItem {
    // Basic nominal calculation without fake statutory math
    const gross = input.activeSalaryStructure.basicMonthly + input.activeSalaryStructure.specialAllowanceMonthly;
    return {
      employeeId: input.employeeId,
      employeeCode: input.employeeCode,
      employeeName: input.employeeName,
      department: input.department,
      payableDays: 30,
      lossOfPayDays: 0,
      lossOfPayDeduction: 0,
      basic: input.activeSalaryStructure.basicMonthly,
      hra: 0,
      conveyance: 0,
      specialAllowance: input.activeSalaryStructure.specialAllowanceMonthly,
      medicalAllowance: 0,
      lta: 0,
      bonus: 0,
      incentives: 0,
      overtimePay: 0,
      arrears: 0,
      reimbursements: 0,
      grossEarnings: gross,
      pfEmployee: 0,
      pfEmployer: 0,
      esicEmployee: 0,
      esicEmployer: 0,
      pt: 0,
      tds: 0,
      lwf: 0,
      loanDeduction: 0,
      otherDeductions: 0,
      gratuityProvision: 0,
      totalDeductions: 0,
      netPayable: gross,
      taxRegime: 'New',
      calculationSnapshotJson: JSON.stringify({
        engine: `GlobalPayroll_${this.countryCode}`,
        note: 'Statutory compliance integration pending for this country.',
      }),
    };
  }
}

export const COUNTRY_ENGINES: Record<string, CountryPayrollEngine> = {
  IN: new IndiaPayrollEngine(),
  US: new FutureCountryPayrollEngineStub('US', 'United States', 'USD'),
  UK: new FutureCountryPayrollEngineStub('UK', 'United Kingdom', 'GBP'),
  AE: new FutureCountryPayrollEngineStub('AE', 'United Arab Emirates', 'AED'),
  SA: new FutureCountryPayrollEngineStub('SA', 'Saudi Arabia', 'SAR'),
  SG: new FutureCountryPayrollEngineStub('SG', 'Singapore', 'SGD'),
  AU: new FutureCountryPayrollEngineStub('AU', 'Australia', 'AUD'),
  EU: new FutureCountryPayrollEngineStub('EU', 'European Union', 'EUR'),
};

export function getPayrollEngine(countryCode: string = 'IN'): CountryPayrollEngine {
  const code = countryCode.toUpperCase();
  return COUNTRY_ENGINES[code] || COUNTRY_ENGINES.IN;
}
