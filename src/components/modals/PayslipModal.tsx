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
            <h3 className="text-sm font-bold text-foreground">Official Payslip</h3>
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
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="MYLOTIC GROUP Logo"
                className="h-10 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">MYLOTIC GROUP PVT.LTD</h2>
                <p className="text-xs text-secondary">100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066</p>
                <p className="text-xs text-secondary">PAN / TAN: AABCA1234M / BLRA12345E</p>
              </div>
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
              <p className="text-secondary font-medium">Bank Name: <span className="text-foreground font-semibold">HDFC Bank</span></p>
              <p className="text-secondary font-medium">Account No: <span className="text-foreground font-semibold">•••• •••• 4921</span></p>
              <p className="text-secondary font-medium">UAN / PF Number: <span className="text-foreground">100234567890</span></p>
              <p className="text-secondary font-medium">Days Paid: <span className="text-foreground font-semibold">31 Days</span></p>
            </div>
          </div>

          {/* Privacy-safe statement summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs font-bold text-foreground">Statement details protected</p>
              <p className="mt-2 text-xs leading-5 text-secondary">
                Financial figures are hidden throughout the HRMS. Use the official payroll channel for authorised financial records.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <p className="text-xs font-bold text-foreground">Processing summary</p>
              <dl className="mt-2 space-y-2 text-xs text-secondary">
                <div className="flex justify-between gap-4"><dt>Statement status</dt><dd className="font-semibold text-foreground">{payslip.status}</dd></div>
                <div className="flex justify-between gap-4"><dt>Pay period</dt><dd className="font-semibold text-foreground">{payslip.monthYear}</dd></div>
                <div className="flex justify-between gap-4"><dt>Processed on</dt><dd className="font-semibold text-foreground">{payslip.paymentDate}</dd></div>
              </dl>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
            <div>
              <span className="text-xs font-bold uppercase text-[#B86B78]">Payment confirmation</span>
              <p className="mt-1 text-sm font-bold text-foreground">Processed securely</p>
            </div>
            <div className="text-right text-xs font-medium text-secondary">
              <p>Deposited to registered bank account</p>
              <p className="text-[10px]">Transaction Ref: TXN-89302198</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
