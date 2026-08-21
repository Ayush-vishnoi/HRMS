'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { exportToExcel } from '@/shared/lib/exportUtils';

type ExpenseCategory =
  | 'Travel'
  | 'Food'
  | 'Hotel'
  | 'Cab'
  | 'Fuel'
  | 'Internet'
  | 'Mobile'
  | 'Medical'
  | 'Business';

type ExpenseClaim = {
  id: string;
  claimNumber: string;
  employeeId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  merchantName: string;
  receiptUrl?: string | null;
  description: string;
  managerStatus: 'Pending' | 'Approved' | 'Rejected';
  financeStatus: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Pending' | 'SettledInPayroll' | 'DirectBankTransferred';
  approvedAmount?: number | null;
  settlementDate?: string | null;
  createdAt: string;
};

const CATEGORIES: ExpenseCategory[] = [
  'Travel',
  'Food',
  'Hotel',
  'Cab',
  'Fuel',
  'Internet',
  'Mobile',
  'Medical',
  'Business',
];

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
const ALLOWED_RECEIPT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export default function ExpensesPage() {
  const { currentUser, employees } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const isManager = currentUser.userRole === 'manager';
  const isApprover = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState<'my' | 'all'>(isApprover ? 'all' : 'my');
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Cab');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [merchantName, setMerchantName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const url =
        activeTab === 'all' && isApprover
          ? `/api/expenses?view=all&role=${encodeURIComponent(currentUser.userRole)}`
          : `/api/expenses?view=my&employeeId=${encodeURIComponent(currentUser.id)}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setClaims(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, [activeTab, currentUser.id, currentUser.userRole]);

  const closeSubmitModal = () => {
    setShowSubmitModal(false);
    setReceiptFile(null);
    setReceiptError('');
  };

  const handleReceiptChange = (file: File | null) => {
    setReceiptError('');

    if (!file) {
      setReceiptFile(null);
      return;
    }

    if (!ALLOWED_RECEIPT_TYPES.has(file.type)) {
      setReceiptFile(null);
      setReceiptError('Only PDF, JPG, PNG, and WEBP receipts are supported.');
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setReceiptFile(null);
      setReceiptError('Receipt must be 10 MB or smaller.');
      return;
    }

    setReceiptFile(file);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab !== 'my' || !title || !amount || !merchantName) return;

    try {
      setSubmitting(true);
      setReceiptError('');
      let receiptUrl: string | undefined;

      if (receiptFile) {
        const uploadData = new FormData();
        uploadData.append('receipt', receiptFile);
        const uploadRes = await fetch('/api/expenses/upload', {
          method: 'POST',
          body: uploadData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson.success) {
          setReceiptError(uploadJson.error || 'Receipt upload failed.');
          return;
        }
        receiptUrl = uploadJson.data.receiptUrl;
      }

      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: currentUser.id,
          title,
          category,
          amount: Number(amount),
          expenseDate,
          merchantName,
          receiptUrl,
          description,
        }),
      });

      if (res.ok) {
        closeSubmitModal();
        setTitle('');
        setAmount('');
        setMerchantName('');
        setDescription('');
        await fetchClaims();
      } else {
        const json = await res.json().catch(() => null);
        setReceiptError(json?.error || 'Failed to submit claim.');
      }
    } catch (err) {
      console.error('Failed to submit claim:', err);
      setReceiptError('Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    claimId: string,
    field: 'managerStatus' | 'financeStatus' | 'paymentStatus',
    status: string,
    approvedAmount?: number
  ) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: claimId,
          [field]: status,
          approvedAmount,
        }),
      });

      if (res.ok) {
        await fetchClaims();
        setSelectedClaim(null);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const searchContent = `${c.claimNumber} ${c.title} ${c.merchantName} ${c.category} ${c.employeeId}`.toLowerCase();
      const matchSearch = !searchQuery || searchContent.includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === 'All' || c.category === categoryFilter;
      const matchStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Pending' && (c.managerStatus === 'Pending' || c.financeStatus === 'Pending')) ||
        (statusFilter === 'Approved' && c.managerStatus === 'Approved' && c.financeStatus === 'Approved') ||
        (statusFilter === 'Settled' && c.paymentStatus !== 'Pending');

      return matchSearch && matchCategory && matchStatus;
    });
  }, [claims, searchQuery, categoryFilter, statusFilter]);

  const totalClaimed = useMemo(() => claims.reduce((s, c) => s + c.amount, 0), [claims]);
  const totalApproved = useMemo(
    () =>
      claims
        .filter((c) => c.managerStatus === 'Approved' && c.financeStatus === 'Approved')
        .reduce((s, c) => s + (c.approvedAmount ?? c.amount), 0),
    [claims]
  );
  const totalSettled = useMemo(
    () =>
      claims
        .filter((c) => c.paymentStatus !== 'Pending')
        .reduce((s, c) => s + (c.approvedAmount ?? c.amount), 0),
    [claims]
  );

  const handleExportExcel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    exportToExcel(
      filteredClaims,
      [
        { header: 'Claim ID', key: 'claimNumber' },
        { header: 'Title', key: 'title' },
        { header: 'Category', key: 'category' },
        { header: 'Merchant', key: 'merchantName' },
        { header: 'Amount (₹)', key: 'amount' },
        { header: 'Expense Date', key: 'expenseDate' },
        { header: 'Manager Approval', key: 'managerStatus' },
        { header: 'Finance Approval', key: 'financeStatus' },
        { header: 'Settlement Status', key: 'paymentStatus' },
      ],
      `expense-claims-${todayStr}.xlsx`,
      'Expense Claims'
    );
  };

  const getEmployeeName = (empId: string) => {
    const found = employees.find((e) => e.id === empId);
    return found ? `${found.name} (${found.employeeCode})` : empId;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Receipt className="h-4 w-4" /> Finance & Reimbursements
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Expenses & Reimbursements
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Submit business expense claims, track receipt verifications, manager sign-offs, and payroll reimbursement settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#17324A]" />
            Export Report
          </button>
          {activeTab === 'my' && (
            <button
              onClick={() => {
                setReceiptError('');
                setShowSubmitModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              File Expense Claim
            </button>
          )}
        </div>
      </div>

      {/* Approver Switcher Tabs */}
      {isApprover && (
        <div className="flex items-center gap-2 p-1.5 bg-[#EAF2F8] border border-[#B0D0EA] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              closeSubmitModal();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#17324A] text-white shadow-sm'
                : 'text-[#52677A] hover:text-[#17324A] hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            All Department Claims
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
            <UserCheck className="h-4 w-4" />
            My Personal Claims
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            TOTAL EXPENSES FILED
          </span>
          <div className="text-3xl font-black text-[#17324A] tracking-tight">
            ₹{totalClaimed.toLocaleString('en-IN')}
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            {claims.length} total expense receipts submitted
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
              APPROVED BY FINANCE
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              Verified
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            ₹{totalApproved.toLocaleString('en-IN')}
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
            Ready for payroll disbursement
          </div>
        </div>

        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm flex flex-col justify-between space-y-4">
          <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
            SETTLED & DISBURSED
          </span>
          <div className="text-3xl font-black text-[#315B76] tracking-tight">
            ₹{totalSettled.toLocaleString('en-IN')}
          </div>
          <div className="pt-3 border-t border-[#F0F4F8] text-xs text-emerald-600 font-semibold">
            Directly reimbursed via Payroll / Bank
          </div>
        </div>
      </div>

      {/* Claims List Table */}
      <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#17324A]">
              {activeTab === 'all' && isApprover ? 'Department Expense Claims' : 'My Expense Reimbursements'}
            </h2>
            <p className="text-xs text-[#667085]">
              Track approvals across reporting manager and finance verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative block">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search claim, merchant, title..."
                className="rounded-lg border border-[#9FC2DC] py-1.5 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-60"
              />
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-[#9FC2DC] px-3 py-1.5 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#9FC2DC] px-3 py-1.5 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">CLAIM NO.</th>
                {activeTab === 'all' && isApprover && (
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">EMPLOYEE</th>
                )}
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">TITLE & MERCHANT</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">CATEGORY</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">DATE</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">AMOUNT</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">APPROVALS</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider">SETTLEMENT</th>
                <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">ACTION</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-4 px-4 font-mono font-bold text-[#17324A]">
                    {claim.claimNumber}
                  </td>
                  {activeTab === 'all' && isApprover && (
                    <td className="py-4 px-4 font-semibold text-[#17324A]">
                      {getEmployeeName(claim.employeeId)}
                    </td>
                  )}
                  <td className="py-4 px-4">
                    <p className="font-bold text-[#17324A]">{claim.title}</p>
                    <p className="text-[10px] text-[#667085]">{claim.merchantName}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-[#EAF2F8] text-[#17324A]">
                      {claim.category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-[#667085]">
                    {claim.expenseDate}
                  </td>
                  <td className="py-4 px-4 font-bold text-[#17324A]">
                    ₹{claim.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-medium text-[#667085]">Mgr:</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            claim.managerStatus === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : claim.managerStatus === 'Rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {claim.managerStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="font-medium text-[#667085]">Fin:</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            claim.financeStatus === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : claim.financeStatus === 'Rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {claim.financeStatus}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        claim.paymentStatus === 'SettledInPayroll' || claim.paymentStatus === 'DirectBankTransferred'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {claim.paymentStatus === 'SettledInPayroll'
                        ? 'Settled (Payroll)'
                        : claim.paymentStatus === 'DirectBankTransferred'
                        ? 'Bank Transferred'
                        : 'Pending'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => setSelectedClaim(claim)}
                      className="px-3 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                    >
                      Details & Review
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClaims.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-[#667085]">
                    No expense claims found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Claim Modal */}
      {activeTab === 'my' && showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <h3 className="text-base font-bold text-[#17324A]">Submit New Expense Claim</h3>
              <button
                type="button"
                onClick={closeSubmitModal}
                className="rounded-lg p-1 text-[#667085] hover:bg-[#F5F9FC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">
                  Expense Title *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Client Travel to Delhi HQ"
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">
                    Expense Date *
                  </label>
                  <input
                    required
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17324A] mb-1">
                    Merchant / Vendor *
                  </label>
                  <input
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Uber, Indigo, Airtel"
                    className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17324A] mb-1">
                  Business Purpose / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context on client engagement, project task, or policy entitlement..."
                  className="w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                />
              </div>

              <div>
                <label htmlFor="expense-receipt" className="block text-xs font-semibold text-[#17324A] mb-1">
                  Receipt (optional)
                </label>
                <label htmlFor="expense-receipt" className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#9FC2DC] bg-[#F8FAFC] px-3 py-2.5 text-xs text-[#52677A] hover:bg-[#F5F9FC]">
                  <Upload className="h-4 w-4 text-[#315B76]" />
                  <span className="truncate">{receiptFile ? receiptFile.name : 'Add PDF, JPG, PNG, or WEBP receipt (max 10 MB)'}</span>
                </label>
                <input
                  id="expense-receipt"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => handleReceiptChange(e.target.files?.[0] ?? null)}
                />
                {receiptError && <p className="mt-1 text-[11px] font-medium text-rose-600">{receiptError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EAF2F8]">
                <button
                  type="button"
                  onClick={closeSubmitModal}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#667085] hover:bg-[#F5F9FC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#17324A] text-xs font-bold text-white shadow-sm hover:bg-[#244A68] disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Details & Review Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[#D9E5EE] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAF2F8] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#5B91B5] uppercase tracking-wider">
                  {selectedClaim.claimNumber}
                </span>
                <h3 className="text-base font-bold text-[#17324A]">{selectedClaim.title}</h3>
              </div>
              <button
                onClick={() => setSelectedClaim(null)}
                className="rounded-lg p-1 text-[#667085] hover:bg-[#F5F9FC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#EAF2F8]">
                <div>
                  <span className="text-[#667085] block">Merchant:</span>
                  <span className="font-bold text-[#17324A]">{selectedClaim.merchantName}</span>
                </div>
                <div>
                  <span className="text-[#667085] block">Amount:</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    ₹{selectedClaim.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block">Category:</span>
                  <span className="font-semibold text-[#17324A]">{selectedClaim.category}</span>
                </div>
                {selectedClaim.receiptUrl && (
                  <div>
                    <span className="text-[#667085] block">Receipt:</span>
                    <a
                      href={selectedClaim.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[#315B76] hover:underline"
                    >
                      Open Receipt
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-[#667085] block">Date:</span>
                  <span className="font-semibold text-[#17324A]">{selectedClaim.expenseDate}</span>
                </div>
              </div>

              {selectedClaim.description && (
                <div>
                  <span className="text-[#667085] block mb-0.5">Description / Purpose:</span>
                  <p className="p-2.5 rounded-lg bg-[#F8FAFC] text-[#17324A]">
                    {selectedClaim.description}
                  </p>
                </div>
              )}

              {/* Approver Actions */}
              {isApprover && (
                <div className="p-3 rounded-xl bg-[#EAF2F8] border border-[#B0D0EA] space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#17324A]">
                    Approver Action Bar
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {selectedClaim.managerStatus !== 'Approved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedClaim.id, 'managerStatus', 'Approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve as Manager
                      </button>
                    )}

                    {isAdmin && selectedClaim.financeStatus !== 'Approved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedClaim.id, 'financeStatus', 'Approved', selectedClaim.amount)}
                        className="px-3 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#244A68] text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Finance Sign-off
                      </button>
                    )}

                    {isAdmin && selectedClaim.paymentStatus === 'Pending' && selectedClaim.financeStatus === 'Approved' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedClaim.id, 'paymentStatus', 'SettledInPayroll')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm"
                      >
                        <Wallet className="h-3.5 w-3.5" /> Mark Settled in Payroll
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
