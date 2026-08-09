
'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import {
  MOCK_PAYSLIPS,
  Payslip,
} from '@/data/mockData';
import { PayslipModal } from '@/components/modals/PayslipModal';
import { exportToExcel } from '@/utils/exportUtils';
import { useHRMS } from '@/context/HRMSContext';

export default function PayrollPage() {
  const [selectedPayslip, setSelectedPayslip] =
    useState<Payslip | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');

  const { currentUser } = useHRMS();
  const isEmployee = currentUser.userRole === 'employee';

  const latest = MOCK_PAYSLIPS[0];
  const months = Array.from(
    new Set(MOCK_PAYSLIPS.map((slip) => slip.monthYear.split(' ')[0]))
  );
  const years = Array.from(
    new Set(MOCK_PAYSLIPS.map((slip) => slip.monthYear.split(' ')[1]))
  );
  const filteredPayslips = MOCK_PAYSLIPS.filter((slip) => {
    const [month, year] = slip.monthYear.split(' ');

    return (
      (selectedMonth === 'ALL' || month === selectedMonth) &&
      (selectedYear === 'ALL' || year === selectedYear)
    );
  });

  const handleExportExcel = () => {
    const todayStr = new Date()
      .toISOString()
      .split('T')[0];

    const filename = `payroll-report-${todayStr}.xlsx`;

    const columns = [
      {
        header: 'Payslip ID',
        key: 'id' as const,
      },
      {
        header: 'Employee',
        key: () => currentUser.name,
      },
      {
        header: 'Pay Period',
        key: 'monthYear' as const,
      },
      {
        header: 'Payment Date',
        key: 'paymentDate' as const,
      },
      {
        header: 'Payment Status',
        key: 'status' as const,
      },
    ];

    exportToExcel(
      filteredPayslips,
      columns,
      filename,
      'Payroll Report'
    );
  };

  if (currentUser.userRole === 'manager') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-8 text-center shadow-md">
          <ShieldCheck className="mx-auto mb-4 h-12 w-12 rounded-full bg-[#EAF2F8] p-3 text-[#17324A]" />
          <h2 className="text-lg font-bold text-[#17324A]">Payroll access restricted</h2>
          <p className="mt-2 text-sm text-[#55708A]">Payroll administration is available only to employees for their own statements and to HR Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            Payroll & Compensation Portal
          </h1>

          <p className="mt-1 text-sm text-[#667085]">
            {isEmployee
              ? 'Access your payroll documents securely through HR.'
              : 'Review payroll processing status and download official monthly statements'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isEmployee && <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            title="Download Payroll Report as Excel"
          >
            <Download className="w-4 h-4 text-[#17324A]" />
            Export Excel
          </button>}
          <button
            onClick={() => setSelectedPayslip(latest)}
            className="px-4 py-2.5 rounded-xl bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            View Latest Payslip ({latest.monthYear})
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md">
        <label htmlFor="pay-month" className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-bold text-[#17324A]">
          Month
          <select
            id="pay-month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm font-medium text-[#17324A] outline-none focus:border-[#5B91B5] focus:ring-2 focus:ring-[#B0D0EA]/50"
          >
            <option value="ALL">All months</option>
            {months.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </label>

        <label htmlFor="pay-year" className="flex min-w-40 flex-1 flex-col gap-1 text-xs font-bold text-[#17324A]">
          Year
          <select
            id="pay-year"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm font-medium text-[#17324A] outline-none focus:border-[#5B91B5] focus:ring-2 focus:ring-[#B0D0EA]/50"
          >
            <option value="ALL">All years</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </label>

        <span className="pb-2 text-xs text-[#667085]">
          {filteredPayslips.length} payslip{filteredPayslips.length === 1 ? '' : 's'} found
        </span>
      </div>

      {/* Payslip Archive Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#17324A]" />
            Monthly Payslip Archive
          </h3>
          <span className="text-xs text-[#667085]">
            {isEmployee ? 'Your payslip archive' : 'Organisation payroll archive'}
          </span>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs border-collapse">

            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#EAF2F8]">

                <th className="py-3 px-4">
                  Pay Period
                </th>

                <th className="py-3 px-4">
                  Payment Date
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

                <th className="py-3 px-4 text-right">
                  Actions
                </th>

              </tr>
            </thead>

            <tbody className="divide-y divide-[#D9E5EE] text-[#17324A]">

              {filteredPayslips.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-sm text-[#667085]"
                  >
                    No payslips found for the selected month and year.
                  </td>
                </tr>
              ) : filteredPayslips.map((slip) => (

                <tr
                  key={slip.id}
                  className="hover:bg-[#F5F9FC] transition-colors"
                >

                  <td className="py-3 px-4 font-bold text-[#17324A]">
                    {slip.monthYear}
                  </td>

                  <td className="py-3 px-4 text-[#667085]">
                    {slip.paymentDate}
                  </td>

                  <td className="py-3 px-4">

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {slip.status}
                    </span>

                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayslip(slip)}
                      className="px-3 py-1.5 rounded-lg bg-[#B0D0EA] hover:bg-[#9FC5E2] text-[#17324A] border border-[#9FC5E2] text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Payslip
                    </button>
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>
      </div>

      {/* Payslip Modal */}
      <PayslipModal
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />

    </div>
  );
}




