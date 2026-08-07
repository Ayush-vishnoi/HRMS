'use client';

import React, { useState } from 'react';
import { CreditCard, DollarSign, FileText, Download, Printer, Eye, Building2, ShieldCheck } from 'lucide-react';
import { MOCK_PAYSLIPS, Payslip, CURRENT_USER } from '@/data/mockData';
import { PayslipModal } from '@/components/modals/PayslipModal';
import { formatINR } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { useHRMS } from '@/context/HRMSContext';

export default function PayrollPage() {
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const { currentUser } = useHRMS();

  const latest = MOCK_PAYSLIPS[0];

  const handleExportExcel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `payroll-report-${todayStr}.xlsx`;

    const columns = [
      { header: 'Payslip ID', key: 'id' as const },
      { header: 'Employee', key: () => currentUser.name },
      { header: 'Pay Period', key: 'monthYear' as const },
      { header: 'Basic Salary', key: 'basicSalary' as const },
      { header: 'HRA', key: 'hra' as const },
      { header: 'Allowances', key: (s: Payslip) => s.conveyance + s.specialAllowance },
      { header: 'PF', key: 'pfDeduction' as const },
      { header: 'TDS / Tax', key: 'taxDeduction' as const },
      { header: 'Gross Earnings', key: 'grossEarnings' as const },
      { header: 'Deductions', key: 'totalDeductions' as const },
      { header: 'Net Salary', key: 'netPayable' as const },
      { header: 'Payment Date', key: 'paymentDate' as const },
      { header: 'Payment Status', key: 'status' as const },
    ];

    exportToExcel(MOCK_PAYSLIPS, columns, filename, 'Payroll Report');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#B86B78]" />
            Payroll & Compensation Portal
          </h1>
          <p className="text-xs text-secondary">View salary breakdown, tax withholdings, and download official monthly payslips</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border hover:bg-surface-elevated text-foreground text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
            title="Download Payroll Report as Excel"
          >
            <Download className="w-4 h-4 text-[#B86B78]" />
            Export Excel
          </button>

          <button
            onClick={() => setSelectedPayslip(latest)}
            className="px-4 py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-lg shadow-[#8B3A4A]/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            View Latest Payslip ({latest.monthYear})
          </button>
        </div>
      </div>

      {/* Salary Overview Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xl col-span-1 md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-bold text-[#B86B78]">Monthly Take-Home Salary</span>
              <div className="text-3xl font-black text-foreground mt-1">{formatINR(latest.netPayable)}</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Direct Deposited
            </span>
          </div>

          <div className="pt-4 border-t border-border grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-secondary">Gross Earnings:</span>
              <span className="font-bold text-emerald-500 block">{formatINR(latest.grossEarnings)}</span>
            </div>
            <div>
              <span className="text-secondary">Total Deductions:</span>
              <span className="font-bold text-rose-500 block">{formatINR(latest.totalDeductions)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Annual CTC Tier</span>
          <div className="text-2xl font-black text-foreground mt-2">{formatINR(CURRENT_USER.salary)}</div>
          <p className="text-[11px] text-secondary mt-1">Band: Senior Level II</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border shadow-md">
          <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tax & Deductions</span>
          <div className="text-2xl font-black text-rose-500 mt-2">{formatINR(latest.taxDeduction)}</div>
          <p className="text-[11px] text-secondary mt-1">PF Contribution: {formatINR(latest.pfDeduction)}</p>
        </div>
      </div>

      {/* Payslip Archive Table */}
      <div className="p-6 rounded-2xl bg-surface border border-border shadow-md space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#B86B78]" />
          Monthly Payslip Archive
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-secondary font-semibold bg-surface-elevated/50">
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground">
              {MOCK_PAYSLIPS.map((slip) => (
                <tr key={slip.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-foreground">{slip.monthYear}</td>
                  <td className="py-3 px-4 text-secondary">{slip.paymentDate}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-500">{formatINR(slip.grossEarnings)}</td>
                  <td className="py-3 px-4 text-rose-500">{formatINR(slip.totalDeductions)}</td>
                  <td className="py-3 px-4 font-bold text-foreground">{formatINR(slip.netPayable)}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {slip.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayslip(slip)}
                      className="px-3 py-1.5 rounded-lg bg-[#8B3A4A]/20 hover:bg-[#8B3A4A] text-[#B86B78] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
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

      <PayslipModal payslip={selectedPayslip} onClose={() => setSelectedPayslip(null)} />
    </div>
  );
}
