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
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#B86B78]" />
            <h3 className="text-sm font-bold text-foreground">Official Salary Payslip</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={() => alert('Downloading PDF Payslip...')}
              className="px-3 py-1.5 rounded-lg bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Body */}
        <div className="p-8 bg-surface text-foreground space-y-6 select-text">
          {/* Company Branding & Statement */}
          <div className="flex items-start justify-between border-b border-border pb-6">
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">Apex Global Technologies Inc.</h2>
              <p className="text-xs text-secondary">100 Tech Plaza, Suite 800, San Francisco, CA 94105</p>
              <p className="text-xs text-secondary">Tax ID / EIN: 94-3829102</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {payslip.status}
              </span>
              <p className="text-xs text-secondary font-medium">Pay Period: <strong className="text-foreground">{payslip.monthYear}</strong></p>
              <p className="text-xs text-secondary font-medium">Pay Date: {payslip.paymentDate}</p>
            </div>
          </div>

          {/* Employee & Bank Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-surface-elevated border border-border text-xs">
            <div>
              <p className="text-secondary font-medium">Employee Name: <span className="text-foreground font-bold">{CURRENT_USER.name}</span></p>
              <p className="text-secondary font-medium">Employee ID: <span className="text-foreground font-semibold">{CURRENT_USER.employeeCode}</span></p>
              <p className="text-secondary font-medium">Designation: <span className="text-foreground">{CURRENT_USER.role}</span></p>
              <p className="text-secondary font-medium">Department: <span className="text-foreground">{CURRENT_USER.department}</span></p>
            </div>
            <div>
              <p className="text-secondary font-medium">Bank Name: <span className="text-foreground font-semibold">Silicon Valley Bank</span></p>
              <p className="text-secondary font-medium">Account No: <span className="text-foreground font-semibold">•••• •••• 4921</span></p>
              <p className="text-secondary font-medium">PF Number: <span className="text-foreground">PF-SF-904812</span></p>
              <p className="text-secondary font-medium">Days Paid: <span className="text-foreground font-semibold">31 Days</span></p>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="grid grid-cols-2 gap-6">
            {/* Earnings */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-surface-elevated px-4 py-2.5 text-xs font-bold text-foreground border-b border-border flex justify-between">
                <span>Earnings Breakdown</span>
                <span>Amount ($)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-secondary">
                  <span>Basic Salary</span>
                  <span className="font-semibold text-foreground">${payslip.basicSalary.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-semibold text-foreground">${payslip.hra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Conveyance Allowance</span>
                  <span className="font-semibold text-foreground">${payslip.conveyance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Special Allowance</span>
                  <span className="font-semibold text-foreground">${payslip.specialAllowance.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground">
                  <span>Gross Earnings</span>
                  <span className="text-emerald-500">${payslip.grossEarnings.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-surface-elevated px-4 py-2.5 text-xs font-bold text-foreground border-b border-border flex justify-between">
                <span>Deductions Breakdown</span>
                <span>Amount ($)</span>
              </div>
              <div className="p-4 space-y-2.5 text-xs">
                <div className="flex justify-between text-secondary">
                  <span>Provident Fund (PF)</span>
                  <span className="font-semibold text-foreground">${payslip.pfDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Income Tax (TDS)</span>
                  <span className="font-semibold text-foreground">${payslip.taxDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-secondary">
                  <span>Professional Tax</span>
                  <span className="font-semibold text-foreground">$0</span>
                </div>
                <div className="flex justify-between text-secondary text-transparent select-none">
                  <span>Filler</span>
                  <span>$0</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground">
                  <span>Total Deductions</span>
                  <span className="text-rose-500">${payslip.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payable Highlight */}
          <div className="p-5 rounded-2xl bg-surface border border-border flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-[#B86B78]">Net Take-Home Pay</span>
              <p className="text-2xl font-black text-foreground mt-0.5">${payslip.netPayable.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-secondary font-medium">
              <p>Direct Deposited to Bank</p>
              <p className="text-[10px] text-secondary">Transaction Ref: TXN-89302198</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
