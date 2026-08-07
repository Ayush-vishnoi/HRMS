'use client';

import React, { useState } from 'react';
import { CreditCard, DollarSign, FileText, Download, Printer, Eye, Building2, ShieldCheck } from 'lucide-react';
import { MOCK_PAYSLIPS, Payslip, CURRENT_USER } from '@/data/mockData';
import { PayslipModal } from '@/components/modals/PayslipModal';

export default function PayrollPage() {
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);

  const latest = MOCK_PAYSLIPS[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Payroll & Compensation Portal
          </h1>
          <p className="text-xs text-slate-400">View salary breakdown, tax withholdings, and download official monthly payslips</p>
        </div>

        <button
          onClick={() => setSelectedPayslip(latest)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <FileText className="w-4 h-4" />
          View Latest Payslip ({latest.monthYear})
        </button>
      </div>

      {/* Salary Overview Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 shadow-xl col-span-1 md:col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-bold text-indigo-300">Monthly Take-Home Salary</span>
              <div className="text-3xl font-black text-white mt-1">${latest.netPayable.toLocaleString()}</div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Direct Deposited
            </span>
          </div>

          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400">Gross Earnings:</span>
              <span className="font-bold text-emerald-400 block">${latest.grossEarnings.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Deductions:</span>
              <span className="font-bold text-rose-400 block">${latest.totalDeductions.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Annual CTC Tier</span>
          <div className="text-2xl font-black text-slate-100 mt-2">${CURRENT_USER.salary.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 mt-1">Band: Senior Level II</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tax & Deductions</span>
          <div className="text-2xl font-black text-rose-400 mt-2">${latest.taxDeduction.toLocaleString()}</div>
          <p className="text-[11px] text-slate-400 mt-1">PF Contribution: ${latest.pfDeduction.toLocaleString()}</p>
        </div>
      </div>

      {/* Payslip Archive Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Monthly Payslip Archive
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-850/50">
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Salary</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {MOCK_PAYSLIPS.map((slip) => (
                <tr key={slip.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-100">{slip.monthYear}</td>
                  <td className="py-3 px-4 text-slate-400">{slip.paymentDate}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-400">${slip.grossEarnings.toLocaleString()}</td>
                  <td className="py-3 px-4 text-rose-400">${slip.totalDeductions.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-slate-100">${slip.netPayable.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {slip.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPayslip(slip)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all ml-auto"
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
