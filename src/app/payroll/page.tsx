'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Eye,
  EyeOff,
  Filter,
  Search,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react';
import type { Payslip } from '@/features/payroll/data/payroll';
import { PayslipModal } from '@/features/payroll/components/PayslipModal';
import { exportToExcel } from '@/shared/lib/exportUtils';
import { useHRMS } from '@/shared/providers/HRMSContext';

type PayrollRecord = Payslip & {
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  roleTitle?: string;
};

export default function PayrollPage() {
  const { currentUser } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';

  const [activeTab, setActiveTab] = useState<'all' | 'my'>(isAdmin ? 'all' : 'my');
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [hideFigures, setHideFigures] = useState(false);
  const [payslips, setPayslips] = useState<PayrollRecord[]>([]);
  const [annualCtc, setAnnualCtc] = useState<number>(550000);
  const [totalDisbursed, setTotalDisbursed] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');

  // If user switches role in context, update default activeTab
  useEffect(() => {
    if (!isAdmin && activeTab === 'all') {
      setActiveTab('my');
    }
  }, [isAdmin, activeTab]);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      const url = activeTab === 'all' && isAdmin
        ? `/api/payroll?view=all&role=admin`
        : `/api/payroll?view=my&employeeId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(currentUser.userRole)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPayslips(json.data.payslips || []);
          if (typeof json.data.annualCtc === 'number') {
            setAnnualCtc(json.data.annualCtc);
          }
          if (typeof json.data.totalDisbursed === 'number') {
            setTotalDisbursed(json.data.totalDisbursed);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch payroll from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [activeTab, currentUser.id, currentUser.userRole, isAdmin]);

  const filteredPayslips = useMemo(() => {
    return payslips.filter((slip) => {
      const text = `${slip.employeeName || ''} ${slip.employeeCode || ''} ${slip.department || ''} ${slip.monthYear} ${slip.id}`.toLowerCase();
      const matchesSearch = !searchQuery || text.includes(searchQuery.toLowerCase());
      const matchesMonth = monthFilter === 'All' || slip.monthYear === monthFilter;
      return matchesSearch && matchesMonth;
    });
  }, [payslips, searchQuery, monthFilter]);

  const uniqueMonths = useMemo(() => {
    const months = Array.from(new Set(payslips.map((p) => p.monthYear)));
    return months;
  }, [payslips]);

  const latest = payslips[0];

  const handleExportExcel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isAll = activeTab === 'all' && isAdmin;
    const filename = isAll ? `all-employees-payroll-${todayStr}.xlsx` : `my-payroll-${todayStr}.xlsx`;

    const columns = isAll
      ? [
          { header: 'Payslip ID', key: 'id' as const },
          { header: 'Employee Name', key: (item: PayrollRecord) => item.employeeName || '—' },
          { header: 'Employee Code', key: (item: PayrollRecord) => item.employeeCode || '—' },
          { header: 'Department', key: (item: PayrollRecord) => item.department || '—' },
          { header: 'Pay Period', key: 'monthYear' as const },
          { header: 'Gross Earnings (₹)', key: 'grossEarnings' as const },
          { header: 'Total Deductions (₹)', key: 'totalDeductions' as const },
          { header: 'Net Payable (₹)', key: 'netPayable' as const },
          { header: 'Payment Date', key: 'paymentDate' as const },
          { header: 'Status', key: 'status' as const },
        ]
      : [
          { header: 'Payslip ID', key: 'id' as const },
          { header: 'Employee', key: () => currentUser.name },
          { header: 'Pay Period', key: 'monthYear' as const },
          { header: 'Gross Earnings (₹)', key: 'grossEarnings' as const },
          { header: 'Total Deductions (₹)', key: 'totalDeductions' as const },
          { header: 'Net Payable (₹)', key: 'netPayable' as const },
          { header: 'Payment Date', key: 'paymentDate' as const },
          { header: 'Status', key: 'status' as const },
        ];

    exportToExcel(
      filteredPayslips,
      columns,
      filename,
      isAll ? 'All Employees Payroll' : 'My Payroll'
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
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Wallet className="h-4 w-4" /> Compensation & Benefits
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Payroll & Payslips
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            {isAdmin
              ? 'Manage organization-wide employee payroll records or review your personal compensation from PostgreSQL.'
              : 'View personal salary breakdown, tax withholdings, and monthly payslips stored in PostgreSQL.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {/* HR Admin Tab Switcher */}
      {isAdmin && (
        <div className="flex items-center gap-2 p-1.5 bg-[#EAF2F8] border border-[#B0D0EA] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#17324A] text-white shadow-sm'
                : 'text-[#52677A] hover:text-[#17324A] hover:bg-white/60'
            }`}
          >
            <UsersRound className="h-4 w-4" />
            All Employees
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-[#17324A] text-white shadow-sm'
                : 'text-[#52677A] hover:text-[#17324A] hover:bg-white/60'
            }`}
          >
            <UserRound className="h-4 w-4" />
            My Payroll
          </button>
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {activeTab === 'all' && isAdmin ? (
          <>
            {/* Admin Card 1: Total Payroll Disbursed */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                  TOTAL ORG PAYROLL DISBURSED
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  PostgreSQL Verified
                </span>
              </div>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {formatAmount(totalDisbursed)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
                Cumulative net payout recorded in database
              </div>
            </div>

            {/* Admin Card 2: Employees on Payroll */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                PAYSLIP RECORDS STORED
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {payslips.length} Payslips
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
                Active salary disbursement records
              </div>
            </div>

            {/* Admin Card 3: Latest Disbursed Cycle */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                LATEST PAY CYCLE
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {latest?.monthYear ?? 'No records'}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
                Direct bank deposit completed
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Personal Card 1: Monthly Take-Home Salary */}
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
                {formatAmount(latest?.netPayable ?? 0)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] flex items-center justify-between text-xs">
                <span className="text-[#667085]">
                  Gross:{' '}
                  <strong className="text-emerald-600 font-semibold ml-1">
                    {formatAmount(latest?.grossEarnings ?? 0)}
                  </strong>
                </span>
                <span className="text-[#667085]">
                  Deductions:{' '}
                  <strong className="text-pink-600 font-semibold ml-1">
                    {formatAmount(latest?.totalDeductions ?? 0)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Personal Card 2: Annual CTC */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                ANNUAL CTC
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {formatAmount(annualCtc || 550000)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
                {currentUser.name} · {currentUser.userRole.toUpperCase()} Compensation Tier
              </div>
            </div>

            {/* Personal Card 3: Current Cycle */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                CURRENT CYCLE
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {latest?.monthYear ?? 'No records'}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
                {latest ? `Disbursed on ${latest.paymentDate}` : 'No payslips generated'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payslip Records Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17324A]">
              {activeTab === 'all' && isAdmin ? 'All Employees Payroll & Payslips' : 'My Monthly Payslip Records'}
            </h2>
            <p className="text-xs text-[#667085]">
              {activeTab === 'all' && isAdmin
                ? 'Showing all employee payslips stored in PostgreSQL. Click "View Details" to open individual payslip breakdown.'
                : `Showing official payslip history for ${currentUser.name}.`}
            </p>
          </div>

          {activeTab === 'all' && isAdmin && (
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative block">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee, ID, department..."
                  className="rounded-lg border border-[#9FC2DC] py-1.5 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-60"
                />
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-lg border border-[#9FC2DC] px-3 py-1.5 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
              >
                <option value="All">All Cycles</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                {activeTab === 'all' && isAdmin && (
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">
                    EMPLOYEE
                  </th>
                )}
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
              {filteredPayslips.map((slip) => (
                <tr
                  key={slip.id}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  {activeTab === 'all' && isAdmin && (
                    <td className="py-4 px-4">
                      <p className="font-bold text-[#17324A] text-xs">{slip.employeeName}</p>
                      <p className="text-[10px] text-[#667085]">{slip.employeeCode} · {slip.department}</p>
                    </td>
                  )}
                  <td className="py-4 px-4 font-bold text-[#17324A] text-xs">
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
                      className="px-3.5 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayslips.length === 0 && !loading && (
                <tr>
                  <td colSpan={activeTab === 'all' && isAdmin ? 7 : 6} className="py-8 text-center text-xs text-[#667085]">
                    No payslip records found in database for the selected criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Details Modal */}
      <PayslipModal
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />

    </div>
  );
}
