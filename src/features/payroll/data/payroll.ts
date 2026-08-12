export interface Payslip {
  id: string;
  monthYear: string;
  basicSalary: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  pfDeduction: number;
  taxDeduction: number;
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
  paymentDate: string;
  status: 'Paid' | 'Processing';
}

export const MOCK_PAYSLIPS: Payslip[] = [
  {
    id: 'PAY-2026-07',
    monthYear: 'July 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '31 July 2026',
    status: 'Paid',
  },
  {
    id: 'PAY-2026-06',
    monthYear: 'June 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '30 June 2026',
    status: 'Paid',
  },
  {
    id: 'PAY-2026-05',
    monthYear: 'May 2026',
    basicSalary: 55000,
    hra: 22000,
    conveyance: 5000,
    specialAllowance: 13833,
    pfDeduction: 6600,
    taxDeduction: 13400,
    grossEarnings: 95833,
    totalDeductions: 20000,
    netPayable: 75833,
    paymentDate: '31 May 2026',
    status: 'Paid',
  },
];
