import { db } from '../src/lib/db';

async function checkPayslips() {
  const slips = await db.payslip.findMany({
    include: { employee: true },
  });
  console.log('Total payslips in DB:', slips.length);
  console.log(slips.map((s) => ({ id: s.id, empId: s.employeeId, name: s.employee.name, month: s.monthYear, net: s.netPayable })));
  await db.$disconnect();
}

checkPayslips();
