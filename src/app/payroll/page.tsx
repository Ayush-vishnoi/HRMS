
'use client';

import React, { useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import {
  CURRENT_USER,
  MOCK_PAYSLIPS,
  Payslip,
} from '@/data/mockData';
import { PayslipModal } from '@/components/modals/PayslipModal';
import { exportToExcel } from '@/utils/exportUtils';
import { useHRMS } from '@/context/HRMSContext';

export default function PayrollPage() {
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [hideFigures, setHideFigures] = useState(false);

  const { currentUser } = useHRMS();

  const latest = MOCK_PAYSLIPS[0];

  const handleExportExcel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `payroll-report-${todayStr}.xlsx`;

    const columns = [
      { header: 'Payslip ID', key: 'id' as const },
      { header: 'Employee', key: () => currentUser.name },
      { header: 'Pay Period', key: 'monthYear' as const },
      { header: 'Gross Earnings', key: 'grossEarnings' as const },
      { header: 'Total Deductions', key: 'totalDeductions' as const },
      { header: 'Net Payable', key: 'netPayable' as const },
      { header: 'Payment Date', key: 'paymentDate' as const },
      { header: 'Payment Status', key: 'status' as const },
    ];

    exportToExcel(
      MOCK_PAYSLIPS,
      columns,
      filename,
      'Payroll Report'
    );
  };



  const formatAmount = (amount: number) => {
    if (hideFigures) return '••••••';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Payroll and Payslips
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            View personal salary breakdown, tax withholdings, and official monthly payslips
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setHideFigures(!hideFigures)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            {hideFigures ? (
              <>
                <Eye className="w-4 h-4 text-[#17324A]" />
                Show Figures
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-[#17324A]" />
                Hide Figures
              </>
            )}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            title="Export Excel"
          >
            <Download className="w-4 h-4 text-[#17324A]" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Monthly Take-Home Salary */}
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
              MONTHLY TAKE-HOME SALARY
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Direct Deposited
            </span>
          </div>

          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            {formatAmount(latest?.netPayable ?? 75833)}
          </div>

          <div className="pt-3 border-t border-[#F0F4F8] flex items-center justify-between text-xs">
            <span className="text-[#667085]">
              Gross Earnings:{' '}
              <strong className="text-emerald-600 font-semibold ml-1">
                {formatAmount(latest?.grossEarnings ?? 95833)}
              </strong>
            </span>
            <span className="text-[#667085]">
              Total Deductions:{' '}
              <strong className="text-pink-600 font-semibold ml-1">
                {formatAmount(latest?.totalDeductions ?? 20000)}
              </strong>
            </span>
          </div>
        </div>

        {/* Card 2: Annual CTC */}
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            ANNUAL CTC
          </span>

          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            {formatAmount(CURRENT_USER.salary || 550000)}
          </div>

          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Executive CTC Structure
          </div>
        </div>

        {/* Card 3: Current Cycle */}
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            CURRENT CYCLE
          </span>

          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            {latest?.monthYear ?? 'July 2026'}
          </div>

          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
            Disbursed on {latest?.paymentDate ?? '31 July 2026'}
          </div>
        </div>

      </div>

      {/* Payslip Records Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
        <h2 className="text-base font-bold text-[#17324A]">
          My Monthly Payslip Records
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                  PAY PERIOD
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                  GROSS EARNINGS
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                  TOTAL DEDUCTIONS
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                  NET PAYABLE
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                  STATUS
                </th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">
                  ACTION
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
              {MOCK_PAYSLIPS.map((slip) => (
                <tr
                  key={slip.id}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="py-4 px-4 font-bold text-[#17324A] text-sm">
                    {slip.monthYear}
                  </td>
                  <td className="py-4 px-4 font-semibold text-[#17324A]">
                    {formatAmount(slip.grossEarnings)}
                  </td>
                  <td className="py-4 px-4 font-semibold text-pink-600">
                    {formatAmount(slip.totalDeductions)}
                  </td>
                  <td className="py-4 px-4 font-bold text-emerald-600">
                    {formatAmount(slip.netPayable)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {slip.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayslip(slip)}
                      className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#0f2334] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      View Details
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





