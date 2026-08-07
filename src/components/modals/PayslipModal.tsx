'use client';

import React from 'react';
import { X, Printer, Download, Building2, CheckCircle2 } from 'lucide-react';
import { Payslip, CURRENT_USER } from '@/data/mockData';

interface PayslipModalProps {
  payslip: Payslip | null;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, onClose }) => {
  if (!payslip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Actions Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Official Salary Payslip</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={() => alert('Downloading PDF Payslip...')}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Body */}
        <div className="p-8 bg-slate-900 text-slate-200 space-y-6 select-text">
          {/* Company Branding & Statement */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Apex Global Technologies Inc.</h2>
              <p className="text-xs text-slate-400">100 Tech Plaza, Suite 800, San Francisco, CA 94105</p>
              <p className="text-xs text-slate-500">Tax ID / EIN: 94-3829102</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {payslip.status}
              </span>
              <p className="text-xs text-slate-400 font-medium">Pay Period: <strong className="text-slate-200">{payslip.monthYear}</strong></p>
              <p className="text-xs text-slate-400 font-medium">Pay Date: {payslip.paymentDate}</p>
            </div>
          </div>

          {/* Employee & Bank Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
            <div>
              <p className="text-slate-400 font-medium">Employee Name: <span className="text-slate-100 font-bold">{CURRENT_USER.name}</span></p>
              <p className="text-slate-400 font-medium">Employee ID: <span className="text-slate-100 font-semibold">{CURRENT_USER.employeeCode}</span></p>
              <p className="text-slate-400 font-medium">Designation: <span className="text-slate-100">{CURRENT_USER.role}</span></p>
              <p className="text-slate-400 font-medium">Department: <span className="text-slate-100">{CURRENT_USER.department}</span></p>
            </div>
            <div>
              <p className="text-slate-400 font-medium">Bank Name: <span className="text-slate-100 font-semibold">Silicon Valley Bank</span></p>
              <p className="text-slate-400 font-medium">Account No: <span className="text-slate-100 font-semibold">•••• •••• 4921</span></p>
              <p className="text-slate-400 font-medium">PF Number: <span className="text-slate-100">PF-SF-904812</span></p>
              <p className="text-slate-400 font-medium">Days Paid: <span className="text-slate-100 font-semibold">31 Days</span></p>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between">
                <span>Earnings Breakdown</span>
                <span>Amount ($)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Basic Salary</span>
                  <span className="font-semibold">${payslip.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-semibold">${payslip.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Conveyance Allowance</span>
                  <span className="font-semibold">${payslip.conveyance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Special Allowance</span>
                  <span className="font-semibold">${payslip.specialAllowance.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-slate-100">
                  <span>Gross Earnings</span>
                  <span className="text-emerald-400">${payslip.grossEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-800/80 px-4 py-2.5 text-xs font-bold text-slate-200 border-b border-slate-800 flex justify-between">
                <span>Deductions Breakdown</span>
                <span>Amount ($)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Provident Fund (PF)</span>
                  <span className="font-semibold">${payslip.pfDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Income Tax (TDS)</span>
                  <span className="font-semibold">${payslip.taxDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Professional Tax</span>
                  <span className="font-semibold">$0</span>
                </div>
                <div className="flex justify-between text-slate-300 text-transparent select-none">
                  <span>Filler</span>
                  <span>$0</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-slate-100">
                  <span>Total Deductions</span>
                  <span className="text-rose-400">${payslip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable Highlight */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-indigo-300">Net Take-Home Pay</span>
              <p className="text-2xl font-black text-white mt-0.5">${payslip.netPayable.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-indigo-300 font-medium">
              <p>Direct Deposited to Bank</p>
              <p className="text-[10px] text-slate-400">Transaction Ref: TXN-89302198</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
