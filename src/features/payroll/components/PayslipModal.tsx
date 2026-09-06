'use client';

import { authFetch } from '@/lib/api-client';
import React, { useState } from 'react';
import { X, Printer, Download, Building2, CheckCircle2, ShieldCheck, FileText, Loader2 } from 'lucide-react';
import { CURRENT_USER } from '@/features/employees/data/employees';

interface PayslipModalProps {
  payslip: any | null;
  showAmounts: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, showAmounts, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  if (!payslip) return null;

  const employeeName = payslip.employeeName || CURRENT_USER.name;
  const employeeCode = payslip.employeeCode || CURRENT_USER.employeeCode;
  const department = payslip.department || CURRENT_USER.department;
  const designation = payslip.roleTitle || CURRENT_USER.role;

  const basicSalary = Number(payslip.basicSalary || 0);
  const hra = Number(payslip.hra || 0);
  const conveyance = Number(payslip.conveyance || 0);
  const specialAllowance = Number(payslip.specialAllowance || 0);
  const medicalAllowance = Number(payslip.medicalAllowance || 1250);
  const lta = Number(payslip.lta || 0);
  const bonus = Number(payslip.bonus || 0);
  const incentives = Number(payslip.incentives || 0);
  const overtimePay = Number(payslip.overtimePay || 0);
  const arrears = Number(payslip.arrears || 0);
  const reimbursements = Number(payslip.reimbursements || 0);
  const grossEarnings = Number(payslip.grossEarnings || 0);

  const pfDeduction = Number(payslip.pfDeduction || 0);
  const esicDeduction = Number(payslip.esicDeduction || 0);
  const ptDeduction = Number(payslip.ptDeduction || 200);
  const taxDeduction = Number(payslip.taxDeduction || 0);
  const lwfDeduction = Number(payslip.lwfDeduction || 0);
  const loanDeduction = Number(payslip.loanDeduction || 0);
  const lossOfPayDeduction = Number(payslip.lossOfPayDeduction || 0);
  const totalDeductions = Number(payslip.totalDeductions || 0);

  const netPayable = Number(payslip.netPayable || 0);

  const pfEmployer = Number(payslip.pfEmployer || 1800);
  const esicEmployer = Number(payslip.esicEmployer || 0);
  const gratuityProvision = Number(payslip.gratuityProvision || 0);

  const payableDays = payslip.payableDays ?? 30;
  const lossOfPayDays = payslip.lossOfPayDays ?? 0;
  const taxRegime = payslip.taxRegime || 'New';
  const panNumber = payslip.panNumber || 'ABCDE1234F';
  const bankAccount = payslip.bankAccountMasked || '•••• •••• 4921';
  const bankIfsc = payslip.bankIfsc || 'HDFC0001234';
  const formatAmount = (value: number) =>
    showAmounts ? `₹${value.toLocaleString('en-IN')}` : '••••••';

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const res = await authFetch<Response>('/api/payroll/pdf', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'payslip',
          payslipId: payslip.id,
        }),
      });

      if (res.ok) {
        const html = await res.text();
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          win.focus();
        }
      }
    } catch (err) {
      console.error('Error downloading payslip:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950/50 p-3 backdrop-blur-xs sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150 sm:max-h-[calc(100dvh-2rem)]">
        {/* Modal Actions Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D9E5EE] bg-[#F8FAFC] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-5 w-5 shrink-0 text-[#8B3A4A]" />
            <h3 className="truncate text-sm font-bold text-[#17324A]">Official Payslip Statement</h3>
            <span className="rounded-md bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-bold text-[#17324A] border border-[#B0D0EA]">
              {taxRegime} Tax Regime
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-[#D9E5EE] shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3 py-1.5 rounded-lg bg-[#8B3A4A] hover:bg-[#A04456] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {downloading ? 'Preparing...' : 'Download Document'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#667085] transition-colors hover:bg-[#EAF2F8] hover:text-[#17324A] cursor-pointer"
              aria-label="Close payslip"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Payslip Document Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-white p-4 text-[#17324A] select-text sm:p-6">
          {/* Company Branding & Statement */}
          <div className="flex flex-col gap-4 border-b border-[#D9E5EE] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/m360-logo.jpeg"
                alt="MYLOTIC GROUP Logo"
                className="h-10 w-auto object-contain shrink-0"
              />
              <div>
                <h2 className="text-lg font-extrabold text-[#17324A] tracking-tight">MYLOTIC GROUP PVT. LTD.</h2>
                <p className="text-xs text-[#667085]">100 Innovation Park, Whitefield, Bengaluru, Karnataka 560066</p>
                <p className="text-[11px] text-[#667085]">PAN: AABCM9876E | TAN: BLRA12345E | PF Code: KN/BNG/0019283</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {payslip.status || 'Paid'}
              </span>
              <p className="text-xs text-[#667085] font-medium">Pay Period: <strong className="text-[#17324A]">{payslip.monthYear}</strong></p>
              <p className="text-xs text-[#667085] font-medium">Payment Date: {payslip.paymentDate || '30 Sep 2026'}</p>
            </div>
          </div>

          {/* Employee & Bank Info */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] p-4 text-xs sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[#667085]">Employee Name: <span className="text-[#17324A] font-bold">{employeeName}</span></p>
              <p className="text-[#667085]">Employee ID: <span className="text-[#17324A] font-semibold">{employeeCode}</span></p>
              <p className="text-[#667085]">Designation: <span className="text-[#17324A]">{designation}</span></p>
              <p className="text-[#667085]">Department: <span className="text-[#17324A]">{department}</span></p>
              <p className="text-[#667085]">PAN Number: <span className="text-[#17324A]">{panNumber}</span></p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[#667085]">Bank Name: <span className="text-[#17324A] font-semibold">HDFC Bank</span></p>
              <p className="text-[#667085]">Account No: <span className="text-[#17324A] font-semibold">{bankAccount}</span></p>
              <p className="text-[#667085]">IFSC Code: <span className="text-[#17324A]">{bankIfsc}</span></p>
              <p className="text-[#667085]">Payable Days: <span className="text-emerald-600 font-bold">{payableDays} Days</span></p>
              <p className="text-[#667085]">Loss of Pay (LOP): <span className="text-rose-600 font-bold">{lossOfPayDays} Days</span></p>
            </div>
          </div>

          {/* Detailed Earnings and Deductions Tables */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Earnings Column */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-4">
              <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Earnings & Allowances</span>
                <span className="text-[11px] text-[#667085]">Amount (₹)</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#667085]">Basic Salary</span><span className="font-semibold text-[#17324A]">{formatAmount(basicSalary)}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">House Rent Allowance (HRA)</span><span className="font-semibold text-[#17324A]">{formatAmount(hra)}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">Conveyance Allowance</span><span className="font-semibold text-[#17324A]">{formatAmount(conveyance)}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">Special Allowance</span><span className="font-semibold text-[#17324A]">{formatAmount(specialAllowance)}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">Medical Allowance</span><span className="font-semibold text-[#17324A]">{formatAmount(medicalAllowance)}</span></div>
                {lta > 0 && <div className="flex justify-between"><span className="text-[#667085]">Leave Travel Allowance</span><span className="font-semibold text-[#17324A]">{formatAmount(lta)}</span></div>}
                {(bonus > 0 || incentives > 0) && (
                  <div className="flex justify-between"><span className="text-[#667085]">Bonus / Variable Pay</span><span className="font-semibold text-emerald-600">{formatAmount(bonus + incentives)}</span></div>
                )}
                {overtimePay > 0 && <div className="flex justify-between"><span className="text-[#667085]">Overtime Earnings</span><span className="font-semibold text-emerald-600">{formatAmount(overtimePay)}</span></div>}
                {arrears > 0 && <div className="flex justify-between"><span className="text-[#667085]">Salary Arrears</span><span className="font-semibold text-emerald-600">{formatAmount(arrears)}</span></div>}
                {reimbursements > 0 && <div className="flex justify-between"><span className="text-[#667085]">Expense Reimbursements</span><span className="font-semibold text-emerald-600">{formatAmount(reimbursements)}</span></div>}
              </div>
              <div className="mt-3 flex justify-between border-t border-[#D9E5EE] pt-2 text-xs font-bold text-emerald-700">
                <span>Total Gross Earnings</span>
                <span>{formatAmount(grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-4">
              <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-2 mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Statutory & Other Deductions</span>
                <span className="text-[11px] text-[#667085]">Amount (₹)</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-[#667085]">Provident Fund (Employee)</span><span className="font-semibold text-[#17324A]">{formatAmount(pfDeduction)}</span></div>
                {esicDeduction > 0 && <div className="flex justify-between"><span className="text-[#667085]">ESIC (Employee 0.75%)</span><span className="font-semibold text-[#17324A]">{formatAmount(esicDeduction)}</span></div>}
                <div className="flex justify-between"><span className="text-[#667085]">Professional Tax (PT)</span><span className="font-semibold text-[#17324A]">{formatAmount(ptDeduction)}</span></div>
                <div className="flex justify-between"><span className="text-[#667085]">Income Tax (TDS)</span><span className="font-semibold text-[#17324A]">{formatAmount(taxDeduction)}</span></div>
                {lwfDeduction > 0 && <div className="flex justify-between"><span className="text-[#667085]">Labour Welfare Fund</span><span className="font-semibold text-[#17324A]">{formatAmount(lwfDeduction)}</span></div>}
                {loanDeduction > 0 && <div className="flex justify-between"><span className="text-[#667085]">Loan / Advance EMI</span><span className="font-semibold text-rose-600">{formatAmount(loanDeduction)}</span></div>}
                {lossOfPayDeduction > 0 && <div className="flex justify-between"><span className="text-[#667085]">Loss of Pay (LOP) Deduction</span><span className="font-semibold text-rose-600">{formatAmount(lossOfPayDeduction)}</span></div>}
              </div>
              <div className="mt-3 flex justify-between border-t border-[#D9E5EE] pt-2 text-xs font-bold text-rose-700">
                <span>Total Deductions</span>
                <span>{formatAmount(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Employer Contributions & Net Payable Box */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] p-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">Employer Contributions (CTC)</span>
              <div className="mt-2 space-y-1.5 text-xs text-[#17324A]">
                <div className="flex justify-between"><dt className="text-[#667085]">PF Employer Contribution (12%):</dt><dd className="font-semibold">{formatAmount(pfEmployer)}</dd></div>
                {esicEmployer > 0 && <div className="flex justify-between"><dt className="text-[#667085]">ESIC Employer (3.25%):</dt><dd className="font-semibold">{formatAmount(esicEmployer)}</dd></div>}
                <div className="flex justify-between"><dt className="text-[#667085]">Gratuity Monthly Provision:</dt><dd className="font-semibold">{formatAmount(gratuityProvision)}</dd></div>
              </div>
            </div>

            <div className="flex flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <span className="text-xs font-bold uppercase text-emerald-800">Net Take-Home Payable</span>
              <p className="mt-1 text-2xl font-black text-emerald-700">{formatAmount(netPayable)}</p>
              <p className="text-[10px] text-emerald-700">Directly transferred to {bankAccount}</p>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] p-3.5 text-xs text-[#667085] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cryptographically verified calculation snapshot preserved in immutable payroll records.</span>
            </div>
            <div className="text-[10px] text-[#667085]">Ref: REF-{employeeCode}-{payslip.monthYear?.replace(/\s+/g, '')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
