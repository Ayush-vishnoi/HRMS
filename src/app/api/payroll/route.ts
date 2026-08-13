import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId') || 'EMP-001';
    const role = searchParams.get('role') || 'employee';
    const view = searchParams.get('view') || 'my';

    // Role & Data Security: Only admin can view "all" employees' payroll data
    const isAdmin = role === 'admin';
    const isAllEmployeesView = view === 'all' && isAdmin;

    const whereClause = isAllEmployeesView ? {} : { employeeId };

    const [payslips, employee] = await Promise.all([
      db.payslip.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true, salary: true, roleTitle: true },
          },
        },
      }),
      db.employee.findUnique({
        where: { id: employeeId },
        select: { salary: true, name: true, employeeCode: true, department: true, roleTitle: true },
      }),
    ]);

    const formattedPayslips = payslips.map((slip) => ({
      id: slip.id,
      employeeId: slip.employeeId,
      employeeName: slip.employee?.name || employee?.name || 'Ayush Vishnoi',
      employeeCode: slip.employee?.employeeCode || employee?.employeeCode || 'EMP-2026-089',
      department: slip.employee?.department || employee?.department || 'Engineering',
      roleTitle: slip.employee?.roleTitle || employee?.roleTitle || 'Developer',
      monthYear: slip.monthYear,
      basicSalary: Number(slip.basicSalary),
      hra: Number(slip.hra),
      conveyance: Number(slip.conveyance),
      specialAllowance: Number(slip.specialAllowance),
      pfDeduction: Number(slip.pfDeduction),
      taxDeduction: Number(slip.taxDeduction),
      grossEarnings: Number(slip.grossEarnings),
      totalDeductions: Number(slip.totalDeductions),
      netPayable: Number(slip.netPayable),
      paymentDate: slip.paymentDate,
      status: slip.status,
    }));

    const totalDisbursed = formattedPayslips.reduce((sum, p) => sum + p.netPayable, 0);

    return NextResponse.json({
      success: true,
      data: {
        payslips: formattedPayslips,
        annualCtc: employee ? Number(employee.salary) : 550000,
        totalDisbursed,
        recordCount: formattedPayslips.length,
      },
    });
  } catch (error) {
    console.error('Error fetching payroll data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payroll data' }, { status: 500 });
  }
}
