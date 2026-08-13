import { db } from '../src/lib/db';

async function seedAdditionalPayslips() {
  const extraPayslips = [
    // Priya Sharma (EMP-006, HR Admin, Annual CTC: 3,600,000 -> Monthly Gross: 300,000)
    {
      id: 'PAY-2026-07-EMP006',
      employeeId: 'EMP-006',
      monthYear: 'July 2026',
      basicSalary: 150000,
      hra: 60000,
      conveyance: 10000,
      specialAllowance: 80000,
      pfDeduction: 18000,
      taxDeduction: 42000,
      grossEarnings: 300000,
      totalDeductions: 60000,
      netPayable: 240000,
      paymentDate: '31 July 2026',
      status: 'Paid' as const,
    },
    {
      id: 'PAY-2026-06-EMP006',
      employeeId: 'EMP-006',
      monthYear: 'June 2026',
      basicSalary: 150000,
      hra: 60000,
      conveyance: 10000,
      specialAllowance: 80000,
      pfDeduction: 18000,
      taxDeduction: 42000,
      grossEarnings: 300000,
      totalDeductions: 60000,
      netPayable: 240000,
      paymentDate: '30 June 2026',
      status: 'Paid' as const,
    },
    // Arjun Mehta (EMP-002, Engineering Manager, Annual CTC: 3,200,000 -> Monthly Gross: 266,667)
    {
      id: 'PAY-2026-07-EMP002',
      employeeId: 'EMP-002',
      monthYear: 'July 2026',
      basicSalary: 133333,
      hra: 53333,
      conveyance: 10000,
      specialAllowance: 70001,
      pfDeduction: 16000,
      taxDeduction: 36000,
      grossEarnings: 266667,
      totalDeductions: 52000,
      netPayable: 214667,
      paymentDate: '31 July 2026',
      status: 'Paid' as const,
    },
    // Rahul Verma (EMP-003, Staff Frontend Engineer, Annual CTC: 2,600,000 -> Monthly Gross: 216,667)
    {
      id: 'PAY-2026-07-EMP003',
      employeeId: 'EMP-003',
      monthYear: 'July 2026',
      basicSalary: 108333,
      hra: 43333,
      conveyance: 8000,
      specialAllowance: 57001,
      pfDeduction: 13000,
      taxDeduction: 28000,
      grossEarnings: 216667,
      totalDeductions: 41000,
      netPayable: 175667,
      paymentDate: '31 July 2026',
      status: 'Paid' as const,
    },
  ];

  for (const slip of extraPayslips) {
    await db.payslip.upsert({
      where: {
        employeeId_monthYear: {
          employeeId: slip.employeeId,
          monthYear: slip.monthYear,
        },
      },
      update: slip,
      create: slip,
    });
  }

  console.log('Seeded payslips for EMP-006, EMP-002, and EMP-003.');
  await db.$disconnect();
}

seedAdditionalPayslips();
