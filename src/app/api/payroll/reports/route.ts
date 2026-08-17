import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import {
  generateDepartmentCostingReport,
  generateEsicReturnReport,
  generatePayrollRegister,
  generatePfEcrReport,
} from '@/lib/payroll/reports-service';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    if (user.userRole !== 'admin' && user.userRole !== 'manager') {
      return NextResponse.json({ success: false, error: 'Unauthorized to view payroll reports.' }, { status: 403 });
    }

    const url = new URL(request.url);
    const reportType = url.searchParams.get('type') || 'register'; // register, pf_ecr, esic, department, ytd
    const cycleId = url.searchParams.get('cycleId');
    const monthYear = url.searchParams.get('monthYear');
    const format = url.searchParams.get('format') || 'json';

    let items: any[] = [];

    if (cycleId) {
      items = await db.payrollCycleItem.findMany({
        where: { cycleId },
        include: { cycle: true },
      });
    } else if (monthYear && monthYear !== 'All') {
      const cycle = await db.payrollCycle.findUnique({
        where: { monthYear },
        include: { items: true },
      });
      items = cycle ? cycle.items : [];
    } else {
      items = await db.payrollCycleItem.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
      });
    }

    let reportData: any = [];

    if (reportType === 'register') {
      reportData = generatePayrollRegister(items);
    } else if (reportType === 'pf_ecr') {
      reportData = generatePfEcrReport(items);
    } else if (reportType === 'esic') {
      reportData = generateEsicReturnReport(items);
    } else if (reportType === 'department') {
      reportData = generateDepartmentCostingReport(items);
    } else {
      reportData = generatePayrollRegister(items);
    }

    if (format === 'csv') {
      if (!reportData || reportData.length === 0) {
        return new Response('No data available', {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${reportType}_report.csv"`,
          },
        });
      }

      const headers = Object.keys(reportData[0]);
      const csvRows = [
        headers.join(','),
        ...reportData.map((row: any) =>
          headers
            .map((h) => {
              const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
              return `"${val.replace(/"/g, '""')}"`;
            })
            .join(',')
        ),
      ];

      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${reportType}_report.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error generating payroll report:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate payroll report' }, { status: 500 });
  }
}
