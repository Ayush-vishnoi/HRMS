'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  FileText,
  Download,
  Eye,
  EyeOff,
  Crown,
  TrendingUp,
  Building,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Check,
  X,
} from 'lucide-react';
import {
  MOCK_PAYSLIPS,
  Payslip,
  CURRENT_USER,
  MOCK_WORKFORCE_BUDGET,
} from '@/data/mockData';
import { PayslipModal } from '@/components/modals/PayslipModal';
import { formatINR } from '@/utils/formatters';
import { exportToExcel } from '@/utils/exportUtils';
import { useHRMS } from '@/context/HRMSContext';

interface PendingRevision {
  id: string;
  employeeName: string;
  role: string;
  department: string;
  currentCTC: number;
  proposedCTC: number;
  percentageIncrease: number;
  recommendedBy: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export default function PayrollPage() {
  const { currentUser } = useHRMS();
  const isCeo = currentUser.userRole === 'ceo' || currentUser.userRole === 'admin';

  // Active view tab for CEO/Admin
  const [activeTab, setActiveTab] = useState<'compensation' | 'personal'>(
    isCeo ? 'compensation' : 'personal'
  );

  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [showSalaryAmounts, setShowSalaryAmounts] = useState(false);

  // Mock pending salary revisions
  const [revisions, setRevisions] = useState<PendingRevision[]>([
    {
      id: 'REV-01',
      employeeName: 'Rahul Verma',
      role: 'Frontend Team Lead',
      department: 'Engineering',
      currentCTC: 2600000,
      proposedCTC: 3000000,
      percentageIncrease: 15.3,
      recommendedBy: 'Arjun Mehta (Engineering Manager)',
      reason: 'Outstanding delivery on design system refactoring and technical team leadership.',
      status: 'Pending',
    },
    {
      id: 'REV-02',
      employeeName: 'Vikram Singh',
      role: 'Backend Developer',
      department: 'Engineering',
      currentCTC: 2400000,
      proposedCTC: 2750000,
      percentageIncrease: 14.5,
      recommendedBy: 'Arjun Mehta (Engineering Manager)',
      reason: 'Key performance in payroll reliability engine and API optimization.',
      status: 'Pending',
    },
    {
      id: 'REV-03',
      employeeName: 'Neha Iyer',
      role: 'Lead HR Operations',
      department: 'Human Resources',
      currentCTC: 1800000,
      proposedCTC: 2100000,
      percentageIncrease: 16.6,
      recommendedBy: 'Priya Sharma (HR Head)',
      reason: 'Exceeded SLA on onboarding velocity and statutory compliance audits.',
      status: 'Pending',
    },
  ]);

  const latest = MOCK_PAYSLIPS[0];

  const maskSalary = (amount: number) => {
    return showSalaryAmounts ? formatINR(amount) : '••••••••';
  };

  const handleApproveRevision = (id: string) => {
    setRevisions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Approved' } : r))
    );
  };

  const handleRejectRevision = (id: string) => {
    setRevisions((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected' } : r))
    );
  };

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
    <div className="space-y-6 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
              Payroll & Compensation Portal
            </h1>
            {isCeo && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                <Crown className="w-3 h-3 text-purple-700" />
                CEO Executive Context
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#667085]">
            {activeTab === 'compensation'
              ? 'Organization-wide workforce compensation, departmental payroll analytics, and salary revision approvals'
              : 'View personal salary breakdown, tax withholdings, and official monthly payslips'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSalaryAmounts(!showSalaryAmounts)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            {showSalaryAmounts ? <EyeOff className="w-4 h-4 text-[#17324A]" /> : <Eye className="w-4 h-4 text-[#17324A]" />}
            {showSalaryAmounts ? 'Hide Figures' : 'Show Figures'}
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#17324A]" />
            Export Excel
          </button>
        </div>
      </div>

      {/* CEO / Executive Role Context Switcher */}
      {isCeo && (
        <div className="flex items-center gap-2 bg-[#F5F9FC] p-1.5 rounded-2xl border border-[#D9E5EE] w-fit">
          <button
            onClick={() => setActiveTab('compensation')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'compensation'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <Building className="w-4 h-4" />
            Workforce Compensation (Org View)
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#17324A] text-white shadow-md'
                : 'text-[#5F7180] hover:text-[#17324A]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            My Payslip (Personal View)
          </button>
        </div>
      )}

      {/* TAB 1: WORKFORCE COMPENSATION (EXECUTIVE VIEW) */}
      {activeTab === 'compensation' && isCeo && (
        <div className="space-y-6">
          {/* Executive Overview KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Monthly Payroll</span>
              <div className="text-2xl font-black text-[#17324A] mt-1 font-mono">₹2.15 Cr</div>
              <span className="text-[11px] font-bold text-emerald-600 mt-1 block">+7.4% YoY Growth</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Annual Payroll Commitment</span>
              <div className="text-2xl font-black text-[#17324A] mt-1 font-mono">₹25.8 Cr</div>
              <span className="text-[11px] font-bold text-[#667085] mt-1 block">105 Active Workforce</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Average Employee CTC</span>
              <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">₹11.85 Lakhs</div>
              <span className="text-[11px] font-bold text-emerald-600 mt-1 block">Competitive Market Band</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-md">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Budget Utilization</span>
              <div className="text-2xl font-black text-emerald-600 mt-1 font-mono">97.7%</div>
              <span className="text-[11px] font-bold text-[#667085] mt-1 block">Budget: ₹2.20 Cr / Actual: ₹2.15 Cr</span>
            </div>
          </div>

          {/* Departmental Payroll Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#17324A]" />
                    Payroll Expenditure by Department
                  </h3>
                  <p className="text-xs text-[#5F7180]">Monthly payroll allocation across company divisions</p>
                </div>
                <span className="text-xs font-bold text-[#17324A]">Total: ₹2.15 Cr</span>
              </div>

              <div className="space-y-3">
                {[
                  { dept: 'Engineering', amount: 85, color: '#17324A', pct: 39.5 },
                  { dept: 'Sales & Customer Success', amount: 42, color: '#2563eb', pct: 19.5 },
                  { dept: 'Marketing & Brand', amount: 28, color: '#7c3aed', pct: 13.0 },
                  { dept: 'Product & Design', amount: 26, color: '#059669', pct: 12.1 },
                  { dept: 'HR & Operations', amount: 15, color: '#d97706', pct: 7.0 },
                  { dept: 'Finance & Legal', amount: 9, color: '#4b5563', pct: 4.2 },
                ].map((item) => (
                  <div key={item.dept} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#17324A]">
                      <span>{item.dept}</span>
                      <span>₹{item.amount} Lakhs ({item.pct}%)</span>
                    </div>
                    <div className="w-full bg-[#EAF2F8] rounded-full h-2.5">
                      <div className="h-2.5 rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compensation Budget vs Actual Overview */}
            <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  Budget vs Actual Variance
                </h3>
                <p className="text-xs text-[#5F7180]">Q3 Financial Compensation Control</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center justify-between">
                  <span className="font-semibold text-[#17324A]">Approved Payroll Budget</span>
                  <span className="font-bold text-[#17324A]">₹2.20 Cr</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex items-center justify-between">
                  <span className="font-semibold text-[#17324A]">Actual Disbursed Payroll</span>
                  <span className="font-bold text-emerald-700">₹2.15 Cr</span>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Favorable Savings Variance</span>
                  <span className="font-black text-emerald-800">+₹5.0 Lakhs</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#17324A] text-white text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#B0D0EA]">Executive Guidance</span>
                <p className="text-xs text-white/90">Workforce compensation costs remain within approved annual budget parameters with a healthy 2.3% variance cushion.</p>
              </div>
            </div>
          </div>

          {/* Pending Salary Revision & Promotion Approvals */}
          <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17324A] flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-700" />
                  Pending Executive Salary Revision Approvals ({revisions.filter((r) => r.status === 'Pending').length})
                </h3>
                <p className="text-xs text-[#5F7180]">
                  Merit increments and strategic promotion requests requiring CEO sign-off
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#17324A]">{rev.employeeName}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A]">{rev.department}</span>
                      <span className="text-[11px] text-[#5F7180]">({rev.role})</span>
                    </div>

                    <p className="text-xs text-[#5F7180]">{rev.reason}</p>

                    <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                      <span>Current: <strong className="text-[#17324A]">{formatINR(rev.currentCTC)}</strong></span>
                      <span>→</span>
                      <span>Proposed: <strong className="text-emerald-700">{formatINR(rev.proposedCTC)}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">+{rev.percentageIncrease}% Increase</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {rev.status === 'Pending' ? (
                      <>
                        <button
                          onClick={() => handleApproveRevision(rev.id)}
                          className="px-4 py-2 rounded-xl bg-[#17324A] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Revision
                        </button>
                        <button
                          onClick={() => handleRejectRevision(rev.id)}
                          className="px-3 py-2 rounded-xl bg-white border border-[#D9E5EE] text-[#5F7180] hover:text-red-600 text-xs font-semibold cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${rev.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                        {rev.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY PAYSLIPS (PERSONAL CEO PAYSLIP VIEW) */}
      {(activeTab === 'personal' || !isCeo) && (
        <div className="space-y-6">
          {/* Salary Overview Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Monthly Take-Home */}
            <div className="p-5 rounded-2xl bg-white border border-[#D9E5EE] shadow-xl col-span-1 md:col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-[#17324A]">Monthly Take-Home Salary</span>
                  </div>
                  <div className="text-3xl font-black text-[#17324A] mt-1 font-mono">
                    {maskSalary(latest.netPayable)}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Direct Deposited
                </span>
              </div>

              <div className="pt-4 border-t border-[#D9E5EE] grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[#667085]">Gross Earnings:</span>
                  <span className="font-bold text-emerald-500 block font-mono">{maskSalary(latest.grossEarnings)}</span>
                </div>
                <div>
                  <span className="text-[#667085]">Total Deductions:</span>
                  <span className="font-bold text-rose-500 block font-mono">{maskSalary(latest.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Annual CTC */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Annual CTC</span>
                <div className="text-2xl font-black text-[#17324A] mt-2 font-mono">{maskSalary(CURRENT_USER.salary)}</div>
              </div>
              <span className="text-[11px] text-[#667085]">Executive CTC Structure</span>
            </div>

            {/* Pay Period */}
            <div className="p-4 rounded-2xl bg-white border border-[#D9E5EE] shadow-md flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Current Cycle</span>
                <div className="text-2xl font-black text-[#17324A] mt-2">{latest.monthYear}</div>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold">Disbursed on {latest.paymentDate}</span>
            </div>
          </div>

          {/* Payslips History Table */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
            <h3 className="text-sm font-bold text-[#17324A]">My Monthly Payslip Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E5EE] text-[#667085] uppercase tracking-wider font-bold text-[10px] bg-[#F5F9FC]">
                    <th className="py-3 px-4 rounded-l-xl">Pay Period</th>
                    <th className="py-3 px-4">Gross Earnings</th>
                    <th className="py-3 px-4">Total Deductions</th>
                    <th className="py-3 px-4">Net Payable</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8]">
                  {MOCK_PAYSLIPS.map((payslip) => (
                    <tr key={payslip.id} className="hover:bg-[#F5F9FC]">
                      <td className="py-3.5 px-4 font-bold text-[#17324A]">{payslip.monthYear}</td>
                      <td className="py-3.5 px-4 font-mono">{maskSalary(payslip.grossEarnings)}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-600">{maskSalary(payslip.totalDeductions)}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">{maskSalary(payslip.netPayable)}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 font-bold text-[11px]">
                          {payslip.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedPayslip(payslip)}
                          className="px-3 py-1.5 rounded-lg bg-[#17324A] text-white font-bold text-[11px] cursor-pointer hover:bg-[#234B68]"
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
        </div>
      )}

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
