'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Globe2,
  Layers,
  Lock,
  Percent,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { PayslipModal } from '@/features/payroll/components/PayslipModal';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { exportToExcel } from '@/shared/lib/exportUtils';

type EmployeeViewSection = 'payslips' | 'structure' | 'taxes' | 'loans' | 'form16';

type AdminViewSection =
  | 'overview'
  | 'processing'
  | 'structures'
  | 'taxes'
  | 'loans'
  | 'variable_pay'
  | 'statutory'
  | 'reconciliation'
  | 'form16'
  | 'reports'
  | 'global';

export default function PayrollPage() {
  const { currentUser, employees } = useHRMS();
  const isAdmin = currentUser.userRole === 'admin';
  const isManager = currentUser.userRole === 'manager';
  const isPrivileged = isAdmin || isManager;

  // View Mode: 'my' for personal employee view, 'all' for organization-wide admin view
  const [viewScope, setViewScope] = useState<'my' | 'all'>(isPrivileged ? 'all' : 'my');
  const [showAmounts, setShowAmounts] = useState(false);
  const formatAmount = (value: number | string | null | undefined) =>
    showAmounts ? `₹${Number(value || 0).toLocaleString('en-IN')}` : '••••••';
  const [empSection, setEmpSection] = useState<EmployeeViewSection>('payslips');
  const [adminSection, setAdminSection] = useState<AdminViewSection>('overview');

  const [loading, setLoading] = useState(false);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('All');
  const [financialYear, setFinancialYear] = useState('2026-27');

  // Payslips Data
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [annualCtc, setAnnualCtc] = useState<number>(550000);
  const [ytdSummary, setYtdSummary] = useState<{ ytdGross: number; ytdTax: number; ytdPf: number }>({
    ytdGross: 0,
    ytdTax: 0,
    ytdPf: 0,
  });
  const [totalDisbursed, setTotalDisbursed] = useState(0);

  // Cycles & Execution Engine Data
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [showRunCycleModal, setShowRunCycleModal] = useState(false);
  const [cycleMonthYear, setCycleMonthYear] = useState('September 2026');
  const [cycleStart, setCycleStart] = useState('2026-09-01');
  const [cycleEnd, setCycleEnd] = useState('2026-09-30');
  const [processingAction, setProcessingAction] = useState(false);

  // Salary Structures & Revisions
  const [structures, setStructures] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [structCtc, setStructCtc] = useState('600000');
  const [structEffectiveDate, setStructEffectiveDate] = useState('2026-04-01');

  // Tax Declarations
  const [taxDeclarations, setTaxDeclarations] = useState<any[]>([]);
  const [myDeclaration, setMyDeclaration] = useState<any | null>(null);
  const [selectedRegime, setSelectedRegime] = useState<'Old' | 'New'>('New');
  const [decl80C, setDecl80C] = useState('150000');
  const [decl80D, setDecl80D] = useState('25000');
  const [declHraRent, setDeclHraRent] = useState('180000');
  const [declHomeLoan, setDeclHomeLoan] = useState('0');
  const [declProofUrl, setDeclProofUrl] = useState('');
  const [selectedDeclForReview, setSelectedDeclForReview] = useState<any | null>(null);
  const [verificationRemarks, setVerificationRemarks] = useState('');

  // Loans & Advances
  const [loans, setLoans] = useState<any[]>([]);
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [loanEmpId, setLoanEmpId] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState('50000');
  const [loanEmi, setLoanEmi] = useState('5000');
  const [loanInstallments, setLoanInstallments] = useState('10');
  const [loanType, setLoanType] = useState('SalaryAdvance');

  // Variable Pay & Arrears
  const [variablePays, setVariablePays] = useState<any[]>([]);
  const [showNewVpModal, setShowNewVpModal] = useState(false);
  const [vpEmpId, setVpEmpId] = useState('');
  const [vpType, setVpType] = useState('PerformanceBonus');
  const [vpAmount, setVpAmount] = useState('25000');
  const [vpMonthYear, setVpMonthYear] = useState('September 2026');
  const [vpReason, setVpReason] = useState('Quarterly Performance Award');

  // Statutory Rules & Components
  const [statutoryConfig, setStatutoryConfig] = useState<any | null>(null);
  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);

  // Reconciliation
  const [reconciliation, setReconciliation] = useState<any | null>(null);
  const [reconLoading, setReconLoading] = useState(false);

  // Form 16
  const [form16Data, setForm16Data] = useState<any | null>(null);
  const [form16EmpId, setForm16EmpId] = useState(currentUser.id);

  // Reports
  const [reportType, setReportType] = useState('register');
  const [reportRows, setReportRows] = useState<any[]>([]);

  const handleLoadFailure = () => {
    setDataLoadError('Some payroll data could not be loaded. Existing information is still available.');
  };

  // 1. Fetch Payslips
  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const url = viewScope === 'all' && isPrivileged ? `/api/payroll?view=all` : `/api/payroll?view=my`;
      const res = await authFetch<Response>(url, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPayslips(json.data.payslips || []);
          if (typeof json.data.annualCtc === 'number') setAnnualCtc(json.data.annualCtc);
          if (json.data.ytd) setYtdSummary(json.data.ytd);
          if (typeof json.data.totalDisbursed === 'number') setTotalDisbursed(json.data.totalDisbursed);
        }
      }
    } catch {
      handleLoadFailure();
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Cycles
  const fetchCycles = async () => {
    try {
      const res = await authFetch<Response>('/api/payroll/engine', { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCycles(json.data);
          if (json.data.length > 0 && !selectedCycle) {
            setSelectedCycle(json.data[0]);
          }
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 3. Fetch Structures
  const fetchStructures = async () => {
    try {
      const res = await authFetch<Response>('/api/payroll/structures', { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setStructures(json.data || []);
          setRevisions(json.revisions || []);
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 4. Fetch Tax Declarations
  const fetchTaxDeclarations = async () => {
    try {
      if (isPrivileged) {
        const resAll = await authFetch<Response>(`/api/payroll/tax-declarations?view=all&financialYear=${financialYear}`, { raw: true });
        if (resAll.ok) {
          const jsonAll = await resAll.json();
          if (jsonAll.success && Array.isArray(jsonAll.data)) {
            setTaxDeclarations(jsonAll.data);
          }
        }
      }
      const resMy = await authFetch<Response>(`/api/payroll/tax-declarations?employeeId=${currentUser.id}&financialYear=${financialYear}`, { raw: true });
      if (resMy.ok) {
        const jsonMy = await resMy.json();
        if (jsonMy.success && jsonMy.data) {
          setMyDeclaration(jsonMy.data);
          setSelectedRegime(jsonMy.data.regime || 'New');
          setDecl80C(String(jsonMy.data.section80C || 150000));
          setDecl80D(String(jsonMy.data.section80D || 25000));
          setDeclHraRent(String(jsonMy.data.hraExemptionRent || 180000));
          setDeclHomeLoan(String(jsonMy.data.homeLoanInterest || 0));
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 5. Fetch Loans
  const fetchLoans = async () => {
    try {
      const url = isPrivileged ? '/api/payroll/loans?view=all' : `/api/payroll/loans?employeeId=${currentUser.id}`;
      const res = await authFetch<Response>(url, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) setLoans(json.data);
      }
    } catch {
      handleLoadFailure();
    }
  };

  const fetchVariablePay = async () => {
    try {
      const url = isPrivileged ? '/api/payroll/variable-pay?view=all' : `/api/payroll/variable-pay?employeeId=${currentUser.id}`;
      const res = await authFetch<Response>(url, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) setVariablePays(json.data);
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 7. Fetch Statutory Rules
  const fetchStatutoryRules = async () => {
    try {
      const res = await authFetch<Response>('/api/payroll/statutory-rules', { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStatutoryConfig(json.data.config);
          setSalaryComponents(json.data.salaryComponents || []);
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 8. Fetch Form 16
  const fetchForm16 = async (empId: string) => {
    try {
      const res = await authFetch<Response>(`/api/payroll/form16?employeeId=${empId}&financialYear=${financialYear}`, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setForm16Data(json.data);
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  // 9. Fetch Reports
  const fetchReports = async (type: string) => {
    try {
      const res = await authFetch<Response>(`/api/payroll/reports?type=${type}`, { raw: true });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setReportRows(json.data);
        }
      }
    } catch {
      handleLoadFailure();
    }
  };

  const refreshPayrollData = () => {
    setDataLoadError(null);
    void fetchPayslips();
    if (isPrivileged) {
      void fetchCycles();
      void fetchStructures();
      void fetchStatutoryRules();
    }
    void fetchTaxDeclarations();
    void fetchLoans();
    void fetchVariablePay();
    void fetchForm16(form16EmpId);
    if (adminSection === 'reports') void fetchReports(reportType);
  };

  useEffect(() => {
    void fetchPayslips();
    if (isPrivileged) {
      void fetchCycles();
      void fetchStructures();
      void fetchStatutoryRules();
    }
    void fetchTaxDeclarations();
    void fetchLoans();
    void fetchVariablePay();
    void fetchForm16(form16EmpId);
  }, [viewScope, currentUser.id, isPrivileged, financialYear]);

  useEffect(() => {
    if (adminSection === 'reports') {
      fetchReports(reportType);
    }
  }, [adminSection, reportType]);

  // Actions
  const handleRunPayrollCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const res = await authFetch<Response>('/api/payroll/engine', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthYear: cycleMonthYear,
          cycleStartDate: cycleStart,
          cycleEndDate: cycleEnd,
        }),
      });
      if (res.ok) {
        setShowRunCycleModal(false);
        await fetchCycles();
        await fetchPayslips();
      }
    } catch (err) {
      console.error('Error calculating cycle:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCycleAction = async (cycleId: string, action: 'under_review' | 'approve' | 'lock' | 'disburse') => {
    try {
      setProcessingAction(true);
      const res = await authFetch<Response>('/api/payroll/engine', { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, action }),
      });
      if (res.ok) {
        await fetchCycles();
        await fetchPayslips();
        if (selectedCycle?.id === cycleId) {
          const updatedRes = await authFetch<Response>(`/api/payroll/engine?cycleId=${cycleId}`, { raw: true });
          if (updatedRes.ok) {
            const j = await updatedRes.json();
            setSelectedCycle(j.data);
          }
        }
      }
    } catch (err) {
      console.error('Error updating cycle status:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleSaveTaxDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcessingAction(true);
      const res = await authFetch<Response>('/api/payroll/tax-declarations', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: currentUser.id,
          financialYear,
          regime: selectedRegime,
          section80C: Number(decl80C),
          section80D: Number(decl80D),
          hraExemptionRent: Number(declHraRent),
          homeLoanInterest: Number(declHomeLoan),
          proofUrls: declProofUrl ? [declProofUrl] : [],
        }),
      });
      if (res.ok) {
        await fetchTaxDeclarations();
      }
    } catch (err) {
      console.error('Error saving tax declaration:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleVerifyTaxDecl = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      setProcessingAction(true);
      const res = await authFetch<Response>('/api/payroll/tax-declarations', { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          declarationStatus: status,
          verificationRemarks,
        }),
      });
      if (res.ok) {
        setSelectedDeclForReview(null);
        await fetchTaxDeclarations();
      }
    } catch (err) {
      console.error('Error verifying tax declaration:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRunReconciliation = async (cycleId: string) => {
    try {
      setReconLoading(true);
      const res = await authFetch<Response>('/api/payroll/reconciliation', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setReconciliation(json.data);
        }
      }
    } catch (err) {
      console.error('Error running reconciliation:', err);
    } finally {
      setReconLoading(false);
    }
  };

  const filteredPayslips = useMemo(() => {
    return payslips.filter((p) => {
      const matchSearch =
        p.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.monthYear?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMonth = monthFilter === 'All' || p.monthYear === monthFilter;
      return matchSearch && matchMonth;
    });
  }, [payslips, searchQuery, monthFilter]);

  const uniqueMonths = useMemo(() => {
    return Array.from(new Set(payslips.map((p) => p.monthYear)));
  }, [payslips]);

  const latestMyPayslip = useMemo(() => {
    const mySlips = payslips.filter((p) => p.employeeId === currentUser.id);
    return mySlips.length > 0 ? mySlips[0] : null;
  }, [payslips, currentUser.id]);

  return (
    <div className="space-y-6">
      {/* 1. Standard HRMS Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <CreditCard className="h-4 w-4" /> Compensation & Payroll
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#17324A]">
            Payroll & Payslips
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[#667085]">
            Official compensation details, monthly payslips, statutory deductions, tax declarations, and payroll processing.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Show/Hide Amounts Toggle */}
          <button
            onClick={() => setShowAmounts((v) => !v)}
            className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            {showAmounts ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAmounts ? 'Hide Amounts' : 'Show Amounts'}
          </button>
          {isPrivileged && (
            <>
              <a
                href={`/api/payroll/reports?type=register&format=csv`}
                download
                className="px-4 py-2.5 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#17324A]" />
                Export Register
              </a>
              <button
                onClick={() => setShowRunCycleModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-white fill-white" />
                Run Payroll Cycle
              </button>
            </>
          )}
        </div>
      </div>

      {dataLoadError && (
        <div
          role="status"
          className="flex flex-col gap-3 border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2 text-xs font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{dataLoadError}</span>
          </div>
          <button
            type="button"
            onClick={refreshPayrollData}
            disabled={loading}
            className="flex items-center justify-center gap-2 self-start text-xs font-bold text-amber-950 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Retry
          </button>
        </div>
      )}

      {/* 2. Primary Role/Scope Switcher */}
      {isPrivileged && (
        <div className="flex items-center gap-2 p-1.5 bg-[#EAF2F8] border border-[#B0D0EA] rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setViewScope('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewScope === 'all'
                ? 'bg-[#17324A] text-white shadow-xs'
                : 'text-[#52677A] hover:text-[#17324A] hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            All Organization
          </button>
          <button
            type="button"
            onClick={() => setViewScope('my')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewScope === 'my'
                ? 'bg-[#17324A] text-white shadow-xs'
                : 'text-[#52677A] hover:text-[#17324A] hover:bg-white/60'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            My Personal Payroll
          </button>
        </div>
      )}

      {/* 3. Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {viewScope === 'all' && isPrivileged ? (
          <>
            {/* Admin Card 1: Active Cycle */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                CURRENT PAYROLL CYCLE
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {cycles[0]?.monthYear || 'September 2026'}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] flex items-center justify-between text-xs">
                <span className="text-[#667085]">
                  Status:{' '}
                  <strong className="text-emerald-600 font-semibold ml-1">
                    {cycles[0]?.status || 'Draft'}
                  </strong>
                </span>
                <span className="text-[#667085]">
                  Total Employees: <strong className="text-[#17324A] font-semibold">{cycles[0]?.totalEmployees || employees.length}</strong>
                </span>
              </div>
            </div>

            {/* Admin Card 2: Total Gross */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                TOTAL GROSS PAYROLL
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {formatAmount(cycles[0]?.totalGross || 2450000)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
                Monthly CTC including employer statutory provisions
              </div>
            </div>

            {/* Admin Card 3: Net Disbursed */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                TOTAL NET TAKE-HOME
              </span>
              <div className="text-3xl font-black text-emerald-600 tracking-tight">
                {formatAmount(cycles[0]?.totalNetPayable || totalDisbursed || 2165000)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] text-xs text-[#667085]">
                Directly transferred to verified bank accounts
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Personal Card 1: Last Disbursed Pay */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                  LAST DISBURSED PAY
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Direct Deposited
                </span>
              </div>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {formatAmount(latestMyPayslip?.netPayable || 75833)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] flex items-center justify-between text-xs">
                <span className="text-[#667085]">
                  Gross:{' '}
                  <strong className="text-emerald-600 font-semibold ml-1">
                    {formatAmount(latestMyPayslip?.grossEarnings || 95833)}
                  </strong>
                </span>
                <span className="text-[#667085]">
                  Deductions:{' '}
                  <strong className="text-pink-600 font-semibold ml-1">
                    {formatAmount(latestMyPayslip?.totalDeductions || 20000)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Personal Card 2: Annual CTC */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
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

            {/* Personal Card 3: YTD Tax & PF */}
            <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-xs flex flex-col justify-between space-y-4">
              <span className="text-[11px] font-bold tracking-wider text-[#667085] uppercase">
                YTD STATUTORY SUMMARY
              </span>
              <div className="text-3xl font-black text-[#17324A] tracking-tight">
                {formatAmount(ytdSummary.ytdGross || 550000)}
              </div>
              <div className="pt-3 border-t border-[#F0F4F8] flex items-center justify-between text-xs text-[#667085]">
                <span>YTD Tax (TDS): <strong className="text-pink-600">{formatAmount(ytdSummary.ytdTax)}</strong></span>
                <span>YTD PF: <strong className="text-[#17324A]">{formatAmount(ytdSummary.ytdPf)}</strong></span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Secondary Section Navigation (Tabs) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D9E5EE] pb-2">
        {viewScope === 'my' ? (
          <>
            <button
              onClick={() => setEmpSection('payslips')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                empSection === 'payslips'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              My Payslips
            </button>
            <button
              onClick={() => setEmpSection('taxes')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                empSection === 'taxes'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              My Tax Declaration
            </button>
            <button
              onClick={() => setEmpSection('loans')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                empSection === 'loans'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              My Loans & Advances
            </button>
            <button
              onClick={() => setEmpSection('form16')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                empSection === 'form16'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              My Form 16 / Tax Statement
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setAdminSection('overview')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'overview'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Monthly Payslips
            </button>
            <button
              onClick={() => setAdminSection('processing')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'processing'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Payroll Processing
            </button>
            <button
              onClick={() => setAdminSection('structures')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'structures'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Salary Structures
            </button>
            <button
              onClick={() => setAdminSection('taxes')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'taxes'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Tax Declarations
            </button>
            <button
              onClick={() => setAdminSection('loans')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'loans'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Loans & Advances
            </button>
            <button
              onClick={() => setAdminSection('variable_pay')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'variable_pay'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Variable Pay & Arrears
            </button>
            <button
              onClick={() => setAdminSection('statutory')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'statutory'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Statutory Rules
            </button>
            <button
              onClick={() => setAdminSection('reconciliation')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'reconciliation'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Reconciliation
            </button>
            <button
              onClick={() => setAdminSection('form16')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'form16'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Form 16
            </button>
            <button
              onClick={() => setAdminSection('reports')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'reports'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Reports & Exports
            </button>
            <button
              onClick={() => setAdminSection('global')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                adminSection === 'global'
                  ? 'bg-[#17324A] text-white shadow-xs'
                  : 'text-[#52677A] hover:text-[#17324A] hover:bg-[#F0F4F8]'
              }`}
            >
              Global Payroll
            </button>
          </>
        )}
      </div>

      {/* 5. MAIN CONTENT AREA */}

      {/* VIEW: PAYSLIP RECORDS (Overview / My Payslips) */}
      {((viewScope === 'my' && empSection === 'payslips') || (viewScope === 'all' && adminSection === 'overview')) && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">
                {viewScope === 'all' ? 'All Organization Monthly Payslip Records' : 'My Monthly Payslip Records'}
              </h2>
              <p className="text-xs text-[#667085]">
                {viewScope === 'all'
                  ? 'Showing all employee payslips generated from locked and disbursed payroll cycles.'
                  : `Showing official payslip history for ${currentUser.name}.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="relative block">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#667085]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee, ID, month..."
                  className="rounded-lg border border-[#9FC2DC] py-1.5 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] sm:w-60 bg-white"
                />
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="rounded-lg border border-[#9FC2DC] px-3 py-1.5 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
              >
                <option value="All">All Pay Periods</option>
                {uniqueMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                  {viewScope === 'all' && (
                    <th className="py-3.5 px-4 font-bold uppercase tracking-wider">EMPLOYEE</th>
                  )}
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">PAY PERIOD</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">GROSS EARNINGS</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">TOTAL DEDUCTIONS</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">NET TAKE-HOME</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">TAX REGIME</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider">STATUS</th>
                  <th className="py-3.5 px-4 font-bold uppercase tracking-wider text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                {filteredPayslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-[#F8FAFC] transition-colors">
                    {viewScope === 'all' && (
                      <td className="py-4 px-4">
                        <p className="font-bold text-[#17324A] text-xs">{slip.employeeName}</p>
                        <p className="text-[10px] text-[#667085]">{slip.employeeCode} · {slip.department}</p>
                      </td>
                    )}
                    <td className="py-4 px-4 font-bold text-[#17324A] text-xs">{slip.monthYear}</td>
                    <td className="py-4 px-4 font-semibold text-emerald-700">
                      {formatAmount(slip.grossEarnings)}
                    </td>
                    <td className="py-4 px-4 font-semibold text-rose-700">
                      {formatAmount(slip.totalDeductions)}
                    </td>
                    <td className="py-4 px-4 font-bold text-[#17324A]">
                      {formatAmount(slip.netPayable)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF2F8] text-[#17324A] border border-[#B0D0EA]">
                        {slip.taxRegime || 'New'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {slip.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedPayslip(slip)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPayslips.length === 0 && !loading && (
                  <tr>
                    <td colSpan={viewScope === 'all' ? 8 : 7} className="py-8 text-center text-xs text-[#667085]">
                      No payslip records found matching the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: ADMIN PAYROLL PROCESSING (Processing Engine) */}
      {viewScope === 'all' && adminSection === 'processing' && (
        <div className="space-y-6">
          {/* Cycle State Machine Card */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">Lifecycle Stage</span>
                <h2 className="text-xl font-extrabold text-[#17324A]">
                  {selectedCycle ? `Cycle: ${selectedCycle.monthYear}` : 'Select a Payroll Cycle'}
                </h2>
                <p className="text-xs text-[#667085]">
                  Workflow: Draft → Calculated → Under Review → Approved → Locked → Disbursed
                </p>
              </div>

              {selectedCycle && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedCycle.status === 'Calculated' && (
                    <button
                      onClick={() => handleCycleAction(selectedCycle.id, 'under_review')}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold hover:bg-amber-100 cursor-pointer"
                    >
                      Submit Under Review
                    </button>
                  )}
                  {(selectedCycle.status === 'Calculated' || selectedCycle.status === 'UnderReview') && (
                    <button
                      onClick={() => handleCycleAction(selectedCycle.id, 'approve')}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-sky-50 text-sky-800 border border-sky-300 text-xs font-bold hover:bg-sky-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Cycle
                    </button>
                  )}
                  {selectedCycle.status === 'Approved' && (
                    <button
                      onClick={() => handleCycleAction(selectedCycle.id, 'lock')}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold hover:bg-rose-100 cursor-pointer flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock Immutability
                    </button>
                  )}
                  {selectedCycle.status === 'Locked' && (
                    <button
                      onClick={() => handleCycleAction(selectedCycle.id, 'disburse')}
                      disabled={processingAction}
                      className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Disburse & Generate Payslips
                    </button>
                  )}
                  {selectedCycle.status === 'Disbursed' && (
                    <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Disbursed & Closed
                    </span>
                  )}
                </div>
              )}
            </div>

            {selectedCycle && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { label: '1. Calculated', done: ['Calculated', 'UnderReview', 'Approved', 'Locked', 'Disbursed'].includes(selectedCycle.status) },
                  { label: '2. Under Review', done: ['UnderReview', 'Approved', 'Locked', 'Disbursed'].includes(selectedCycle.status) },
                  { label: '3. Approved', done: ['Approved', 'Locked', 'Disbursed'].includes(selectedCycle.status) },
                  { label: '4. Locked & Disbursed', done: ['Locked', 'Disbursed'].includes(selectedCycle.status) },
                ].map((step, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-xs font-bold border flex items-center justify-between ${
                      step.done
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span>{step.label}</span>
                    {step.done ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Table */}
          {selectedCycle && selectedCycle.items && (
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-[#17324A]">Calculation Snapshot Line Items</h3>
                  <p className="text-xs text-[#667085]">
                    Total {selectedCycle.items.length} employees calculated with full statutory deductions.
                  </p>
                </div>
                <button
                  onClick={() => handleRunReconciliation(selectedCycle.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold border border-[#D9E5EE] shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Run Audit Reconciliation
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                      <th className="py-3 px-4 uppercase">EMPLOYEE</th>
                      <th className="py-3 px-3 uppercase">DAYS (PAID/LOP)</th>
                      <th className="py-3 px-3 uppercase text-right">BASIC</th>
                      <th className="py-3 px-3 uppercase text-right">HRA</th>
                      <th className="py-3 px-3 uppercase text-right">SPECIAL</th>
                      <th className="py-3 px-3 uppercase text-right">GROSS</th>
                      <th className="py-3 px-3 uppercase text-right">PF</th>
                      <th className="py-3 px-3 uppercase text-right">PT</th>
                      <th className="py-3 px-3 uppercase text-right">TDS</th>
                      <th className="py-3 px-3 uppercase text-right">NET PAY</th>
                      <th className="py-3 px-3 text-center uppercase">SNAPSHOT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                    {selectedCycle.items.map((item: any) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4">
                          <p className="font-bold text-[#17324A]">{item.employeeName}</p>
                          <p className="text-[10px] text-[#667085]">{item.employeeCode} · {item.department}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-700">{item.payableDays ?? 30}</span> /{' '}
                          <span className="text-rose-600 font-semibold">{item.lossOfPayDays ?? 0}</span>
                        </td>
                        <td className="py-3 px-3 text-right">{formatAmount(item.basic)}</td>
                        <td className="py-3 px-3 text-right">{formatAmount(item.hra)}</td>
                        <td className="py-3 px-3 text-right">{formatAmount(item.specialAllowance)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-700">{formatAmount(item.grossEarnings)}</td>
                        <td className="py-3 px-3 text-right text-rose-700">{formatAmount(item.pfEmployee)}</td>
                        <td className="py-3 px-3 text-right text-rose-700">{formatAmount(item.pt)}</td>
                        <td className="py-3 px-3 text-right font-semibold text-rose-700">{formatAmount(item.tds)}</td>
                        <td className="py-3 px-3 text-right font-bold text-[#17324A]">{formatAmount(item.netPayable)}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => alert(item.calculationSnapshotJson || 'Snapshot verified in database.')}
                            className="p-1 rounded hover:bg-[#EAF2F8] text-[#667085] hover:text-[#17324A] cursor-pointer"
                            title="Inspect JSON Snapshot"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: SALARY STRUCTURES (Admin View) */}
      {viewScope === 'all' && adminSection === 'structures' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Employee Salary Structure Configurations</h2>
              <p className="text-xs text-[#667085]">
                Configure monthly earnings and statutory CTC breakdowns. Revisions are logged to SalaryRevisionHistory.
              </p>
            </div>
            <button
              onClick={() => setShowStructureModal(true)}
              className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Revise Structure
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4 uppercase">EMPLOYEE</th>
                  <th className="py-3 px-4 uppercase text-right">ANNUAL CTC</th>
                  <th className="py-3 px-4 uppercase text-right">BASIC / MO</th>
                  <th className="py-3 px-4 uppercase text-right">HRA / MO</th>
                  <th className="py-3 px-4 uppercase text-right">SPECIAL / MO</th>
                  <th className="py-3 px-4 uppercase text-right">PF (EE)</th>
                  <th className="py-3 px-4 uppercase">EFFECTIVE FROM</th>
                  <th className="py-3 px-4 uppercase text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                {structures.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#17324A]">{s.employeeName}</p>
                      <p className="text-[10px] text-[#667085]">{s.employeeCode} · {s.department}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#17324A]">
                      {formatAmount(s.ctcAnnual)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium">
                      {formatAmount(s.basicMonthly)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {formatAmount(s.hraMonthly)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {formatAmount(s.specialAllowanceMonthly)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-rose-700">
                      {formatAmount(s.pfEmployeeMonthly)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#667085]">{s.effectiveFrom}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedEmpId(s.employeeId);
                          setStructCtc(String(s.ctcAnnual));
                          setStructEffectiveDate(s.effectiveFrom || '2026-04-01');
                          setShowStructureModal(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold cursor-pointer"
                      >
                        Revise
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: TAX DECLARATIONS (Employee & Admin) */}
      {((viewScope === 'my' && empSection === 'taxes') || (viewScope === 'all' && adminSection === 'taxes')) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Declaration Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">Tax Declaration</span>
              <h3 className="text-base font-extrabold text-[#17324A]">Regime Choice & Chapter VI-A</h3>
              <p className="text-xs text-[#667085]">Financial Year: {financialYear}</p>
            </div>

            <form onSubmit={handleSaveTaxDeclaration} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#17324A] font-semibold mb-1">Income Tax Regime</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegime('New')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      selectedRegime === 'New'
                        ? 'bg-[#17324A] border-[#17324A] text-white shadow-xs'
                        : 'bg-white border-[#D9E5EE] text-[#667085] hover:bg-[#F5F9FC]'
                    }`}
                  >
                    New Regime (115BAC)
                    <div className="text-[10px] font-normal opacity-80">Std ₹75k Deduct</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRegime('Old')}
                    className={`py-2 px-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      selectedRegime === 'Old'
                        ? 'bg-[#17324A] border-[#17324A] text-white shadow-xs'
                        : 'bg-white border-[#D9E5EE] text-[#667085] hover:bg-[#F5F9FC]'
                    }`}
                  >
                    Old Regime
                    <div className="text-[10px] font-normal opacity-80">80C, 80D, HRA Exemption</div>
                  </button>
                </div>
              </div>

              {selectedRegime === 'Old' && (
                <>
                  <div>
                    <label className="block text-[#17324A] font-semibold mb-1">Section 80C (Max ₹1.5L)</label>
                    <input
                      type="number"
                      value={decl80C}
                      onChange={(e) => setDecl80C(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#17324A] font-semibold mb-1">Section 80D Medical (Max ₹75k)</label>
                    <input
                      type="number"
                      value={decl80D}
                      onChange={(e) => setDecl80D(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#17324A] font-semibold mb-1">Annual Rent Paid for HRA Exemption</label>
                    <input
                      type="number"
                      value={declHraRent}
                      onChange={(e) => setDeclHraRent(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#17324A] font-semibold mb-1">Section 24(b) Home Loan Interest</label>
                    <input
                      type="number"
                      value={declHomeLoan}
                      onChange={(e) => setDeclHomeLoan(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[#17324A] font-semibold mb-1">Proof Attachment Link (Drive/Cloud)</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={declProofUrl}
                      onChange={(e) => setDeclProofUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={processingAction}
                className="w-full py-2.5 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Submit Tax Declaration
              </button>
            </form>
          </div>

          {/* Admin Verification Table */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">HR Review & Verification</span>
                <h3 className="text-base font-extrabold text-[#17324A]">Employee Investment Declarations</h3>
              </div>
              <span className="text-xs text-[#667085]">Total {taxDeclarations.length} Declarations</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                    <th className="py-3 px-3 uppercase">EMPLOYEE</th>
                    <th className="py-3 px-3 uppercase">REGIME</th>
                    <th className="py-3 px-3 uppercase text-right">80C</th>
                    <th className="py-3 px-3 uppercase text-right">80D</th>
                    <th className="py-3 px-3 uppercase text-right">RENT PAID</th>
                    <th className="py-3 px-3 uppercase">STATUS</th>
                    <th className="py-3 px-3 text-right uppercase">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                  {taxDeclarations.map((decl) => (
                    <tr key={decl.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-3 font-semibold">{decl.employeeId}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EAF2F8] text-[#17324A]">
                          {decl.regime}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">{formatAmount(decl.section80C)}</td>
                      <td className="py-3 px-3 text-right">{formatAmount(decl.section80D)}</td>
                      <td className="py-3 px-3 text-right">{formatAmount(decl.hraExemptionRent)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            decl.declarationStatus === 'Approved'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {decl.declarationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isPrivileged && (
                          <button
                            onClick={() => setSelectedDeclForReview(decl)}
                            className="px-2.5 py-1 rounded bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#17324A] text-xs font-semibold cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LOANS & ADVANCES */}
      {((viewScope === 'my' && empSection === 'loans') || (viewScope === 'all' && adminSection === 'loans')) && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Employee Loans & Salary Advances</h2>
              <p className="text-xs text-[#667085]">Automated monthly EMI deductions with balance protection.</p>
            </div>
            {isPrivileged && (
              <button
                onClick={() => setShowNewLoanModal(true)}
                className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Disburse Advance / Loan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {loans.map((loan) => (
              <div key={loan.id} className="p-5 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17324A]">{loan.loanType}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    {loan.status}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-[#667085]">Principal Disbursed</div>
                  <div className="text-xl font-black text-[#17324A]">{formatAmount(loan.principalAmount)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#667085]">
                  <div>Monthly EMI: <strong className="text-[#17324A]">{formatAmount(loan.monthlyEmi)}</strong></div>
                  <div>Remaining: <strong className="text-rose-600">{formatAmount(loan.remainingBalance)}</strong></div>
                  <div>Tenure: {loan.paidInstallments}/{loan.totalInstallments} Months</div>
                  <div>Date: {loan.disbursedOn}</div>
                </div>
                <div className="w-full bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5"
                    style={{
                      width: `${Math.min(100, Math.round(((loan.principalAmount - loan.remainingBalance) / loan.principalAmount) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: VARIABLE PAY & ARREARS (Admin) */}
      {viewScope === 'all' && adminSection === 'variable_pay' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Variable Pay, Bonuses & Retroactive Arrears</h2>
              <p className="text-xs text-[#667085]">Approve performance bonuses, sales incentives, and retroactive salary revision arrears.</p>
            </div>
            <button
              onClick={() => setShowNewVpModal(true)}
              className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Variable Pay / Arrear
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#D9E5EE] text-[#667085] font-semibold bg-[#F8FAFC]">
                  <th className="py-3 px-4 uppercase">EMPLOYEE ID</th>
                  <th className="py-3 px-4 uppercase">PAY TYPE</th>
                  <th className="py-3 px-4 uppercase text-right">AMOUNT</th>
                  <th className="py-3 px-4 uppercase">PAY PERIOD</th>
                  <th className="py-3 px-4 uppercase">REASON / NOTES</th>
                  <th className="py-3 px-4 uppercase">TAXABLE</th>
                  <th className="py-3 px-4 uppercase">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                {variablePays.map((vp) => (
                  <tr key={vp.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3.5 px-4 font-bold">{vp.employeeId}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#17324A]">{vp.payType}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      {formatAmount(vp.amount)}
                    </td>
                    <td className="py-3.5 px-4">{vp.monthYear}</td>
                    <td className="py-3.5 px-4 text-[#667085]">{vp.reason}</td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold text-amber-700">Yes</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        {vp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW: STATUTORY RULES (Admin) */}
      {viewScope === 'all' && adminSection === 'statutory' && statutoryConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">National Statutory Rules</span>
              <h3 className="text-base font-extrabold text-[#17324A]">EPF, ESIC & Gratuity Basis</h3>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE] flex justify-between items-center">
                <div>
                  <div className="font-bold text-[#17324A]">Employees' Provident Fund (EPF)</div>
                  <div className="text-[#667085]">Wage ceiling: ₹15,000 / month</div>
                </div>
                <div className="text-right font-bold text-emerald-700">12% EE / 12% ER (Max ₹1,800/mo)</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE] flex justify-between items-center">
                <div>
                  <div className="font-bold text-[#17324A]">Employee State Insurance (ESIC)</div>
                  <div className="text-[#667085]">Wage threshold: ₹21,000 / month</div>
                </div>
                <div className="text-right font-bold text-emerald-700">0.75% EE / 3.25% ER</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE] flex justify-between items-center">
                <div>
                  <div className="font-bold text-[#17324A]">Gratuity Employer Provision</div>
                  <div className="text-[#667085]">Formula: (Basic × 15 / 26) ÷ 12</div>
                </div>
                <div className="text-right font-bold text-emerald-700">~4.81% of Basic</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">State PT Slabs</span>
              <h3 className="text-base font-extrabold text-[#17324A]">Professional Tax Slabs by State</h3>
            </div>
            <div className="space-y-2 text-xs max-h-72 overflow-y-auto pr-1">
              {Object.entries(statutoryConfig.pt.stateSlabs).map(([state, slabs]: any) => (
                <div key={state} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE]">
                  <div className="font-bold text-[#17324A] mb-1">{state}</div>
                  <div className="space-y-1 text-[11px] text-[#667085]">
                    {slabs.map((s: any, idx: number) => (
                      <div key={idx} className="flex justify-between">
                        <span>Gross ₹{s.minMonthlyGross?.toLocaleString('en-IN')} - {s.maxMonthlyGross ? `₹${s.maxMonthlyGross.toLocaleString('en-IN')}` : 'Above'}:</span>
                        <strong className="text-[#17324A]">₹{s.monthlyTax}/mo {s.februaryTax ? `(Feb: ₹${s.februaryTax})` : ''}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: RECONCILIATION (Admin) */}
      {viewScope === 'all' && adminSection === 'reconciliation' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Payroll Reconciliation & Anomaly Engine</h2>
              <p className="text-xs text-[#667085]">Cross-validates calculated line items against payslips and bank export amounts.</p>
            </div>
            {selectedCycle && (
              <button
                onClick={() => handleRunReconciliation(selectedCycle.id)}
                disabled={reconLoading}
                className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${reconLoading ? 'animate-spin' : ''}`} />
                Run Reconciliation for {selectedCycle.monthYear}
              </button>
            )}
          </div>

          {reconciliation ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    reconciliation.status === 'MATCHED'
                      ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  STATUS: {reconciliation.status}
                </span>
                <span className="text-xs text-[#667085]">
                  {reconciliation.discrepanciesCount} Anomalies Flagged
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE]">
                  <div className="text-[#667085]">Headcount</div>
                  <div className="text-lg font-bold text-[#17324A]">{reconciliation.totalEmployees}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE]">
                  <div className="text-[#667085]">Gross Calculated</div>
                  <div className="text-lg font-bold text-emerald-700">{formatAmount(reconciliation.totalGross)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE]">
                  <div className="text-[#667085]">Total Deductions</div>
                  <div className="text-lg font-bold text-rose-700">{formatAmount(reconciliation.totalDeductions)}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE]">
                  <div className="text-[#667085]">Net Disbursable</div>
                  <div className="text-lg font-bold text-[#17324A]">{formatAmount(reconciliation.totalNet)}</div>
                </div>
              </div>

              {reconciliation.anomalies && reconciliation.anomalies.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase text-[#17324A]">Flagged Discrepancies</div>
                  {reconciliation.anomalies.map((anom: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold">[{anom.type}] {anom.employeeName || 'System'}</div>
                        <div className="text-rose-700">{anom.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>100% Payroll Reconciliation Parity verified! No negative net pay or duplicate records found.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#667085]">
              Select a payroll cycle and run reconciliation to audit line-item parity.
            </div>
          )}
        </div>
      )}

      {/* VIEW: FORM 16 & ANNUAL TAX STATEMENT */}
      {((viewScope === 'my' && empSection === 'form16') || (viewScope === 'all' && adminSection === 'form16')) && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#17324A]">Annual Tax Statement / Form 16 Preparation Sheet</h2>
              <p className="text-xs text-[#667085]">
                Annual Section 17(1) Gross, Section 10 Exemptions, Chapter VI-A Deductions and Quarterly TDS Breakdown.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-[#9FC2DC] text-xs font-semibold text-[#17324A] bg-white"
              >
                <option value="2026-27">FY 2026-27 (AY 2027-28)</option>
                <option value="2025-26">FY 2025-26 (AY 2026-27)</option>
              </select>
              <button
                onClick={async () => {
                  const res = await authFetch<Response>('/api/payroll/pdf', { raw: true,
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentType: 'form16', employeeId: form16EmpId, financialYear }),
                  });
                  if (res.ok) {
                    const html = await res.text();
                    const win = window.open('', '_blank');
                    if (win) {
                      win.document.write(html);
                      win.document.close();
                    }
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Download Statement
              </button>
            </div>
          </div>

          {form16Data && (
            <div className="p-5 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-[#D9E5EE] pb-4">
                <div>
                  <div className="text-[#667085]">Employer Name & TAN</div>
                  <div className="font-bold text-[#17324A]">{form16Data.employer.name}</div>
                  <div className="text-[#667085] font-mono">TAN: {form16Data.employer.tan}</div>
                </div>
                <div>
                  <div className="text-[#667085]">Employee Name & PAN</div>
                  <div className="font-bold text-[#17324A]">{form16Data.employee.name} ({form16Data.employee.code})</div>
                  <div className="text-[#667085] font-mono">PAN: {form16Data.employee.pan}</div>
                </div>
                <div>
                  <div className="text-[#667085]">Selected Tax Regime</div>
                  <div className="font-bold text-[#17324A]">{form16Data.partB.regimeSelected} Tax Regime</div>
                  <div className="text-[#667085]">AY: {form16Data.assessmentYear}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-bold uppercase text-[#17324A]">Part B — Details of Salary Paid and Deductions</div>
                <div className="p-4 rounded-xl bg-white border border-[#D9E5EE] space-y-2">
                  <div className="flex justify-between"><span className="text-[#667085]">1. Gross Salary (Section 17(1))</span><span className="font-semibold text-[#17324A]">{formatAmount(form16Data.partB.grossSalary.totalGross)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>2. Less: Section 10 Allowances / Std Deduction</span><span>- {formatAmount(form16Data.partB.exemptionsUnderSection10.totalExemptions)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">3. Total Salary after Exemptions</span><span className="font-semibold text-[#17324A]">{formatAmount(form16Data.partB.totalSalaryAfterExemptions)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>4. Less: Chapter VI-A Deductions</span><span>- {formatAmount(form16Data.partB.deductionsUnderChapterVIA.totalDeductions)}</span></div>
                  <div className="flex justify-between font-bold text-sm border-t border-[#D9E5EE] pt-2"><span className="text-[#17324A]">5. TOTAL TAXABLE INCOME</span><span className="text-[#17324A]">{formatAmount(form16Data.partB.totalTaxableIncome)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">6. Total Tax Payable (including Cess)</span><span className="font-bold text-rose-700">{formatAmount(form16Data.partB.netTaxPayable)}</span></div>
                  <div className="flex justify-between"><span className="text-[#667085]">7. TDS Deducted & Deposited</span><span className="font-semibold text-[#17324A]">{formatAmount(form16Data.partB.taxDeductedAtSource)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: REPORTS & EXPORTS (Admin) */}
      {viewScope === 'all' && adminSection === 'reports' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {['register', 'pf_ecr', 'esic', 'department'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReportType(type)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                    reportType === type
                      ? 'bg-[#17324A] text-white shadow-xs'
                      : 'bg-white text-[#52677A] hover:bg-[#F5F9FC] border border-[#D9E5EE]'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
            <a
              href={`/api/payroll/reports?type=${reportType}&format=csv`}
              download
              className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
          </div>

          <div className="overflow-x-auto max-h-96">
            {reportRows.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#D9E5EE] bg-[#F8FAFC] text-[#667085] font-semibold sticky top-0">
                    {Object.keys(reportRows[0]).map((col) => (
                      <th key={col} className="py-3 px-3.5 whitespace-nowrap uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAF2F8] text-[#17324A]">
                  {reportRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#F8FAFC]">
                      {Object.values(row).map((val: any, cidx) => (
                        <td key={cidx} className="py-2.5 px-3.5 whitespace-nowrap">
                          {typeof val === 'number' ? formatAmount(val) : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-xs text-[#667085]">No report rows available.</div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: GLOBAL PAYROLL (Admin) */}
      {viewScope === 'all' && adminSection === 'global' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <Globe2 className="w-5 h-5 text-[#5B91B5]" />
              <h2 className="text-base font-bold text-[#17324A]">Global Multi-Country Payroll Framework</h2>
            </div>
            <p className="text-xs text-[#667085] mt-1">
              Pluggable country dispatcher preserved. India is fully active; international country stubs are ready for future statutory compliance integration without mock values.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {[
              { code: 'IN', name: 'India', status: 'ACTIVE_STATUTORY', currency: 'INR', desc: 'PF, ESIC, State PT, LWF, Old/New Tax Engine' },
              { code: 'US', name: 'United States', status: 'FUTURE_SUPPORT', currency: 'USD', desc: 'Federal, State Tax & FICA Framework' },
              { code: 'UK', name: 'United Kingdom', status: 'FUTURE_SUPPORT', currency: 'GBP', desc: 'PAYE & National Insurance Framework' },
              { code: 'AE', name: 'United Arab Emirates', status: 'FUTURE_SUPPORT', currency: 'AED', desc: 'WPS & Gratuity Accrual Framework' },
              { code: 'SA', name: 'Saudi Arabia', status: 'FUTURE_SUPPORT', currency: 'SAR', desc: 'GOSI Compliance Framework' },
              { code: 'SG', name: 'Singapore', status: 'FUTURE_SUPPORT', currency: 'SGD', desc: 'CPF & IRAS Framework' },
              { code: 'AU', name: 'Australia', status: 'FUTURE_SUPPORT', currency: 'AUD', desc: 'Superannuation & PAYG Framework' },
              { code: 'EU', name: 'European Union', status: 'FUTURE_SUPPORT', currency: 'EUR', desc: 'Multi-jurisdiction Statutory Framework' },
            ].map((c) => (
              <div key={c.code} className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#17324A] text-sm">{c.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      c.status === 'ACTIVE_STATUTORY'
                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="text-xs text-[#667085]">{c.desc}</div>
                <div className="text-[11px] text-[#667085] font-mono">Currency: {c.currency}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Run New Payroll Cycle */}
      {showRunCycleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D9E5EE] bg-white p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#17324A]">Execute Monthly Payroll Cycle</h3>
              <button onClick={() => setShowRunCycleModal(false)} className="text-[#667085] hover:text-[#17324A] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRunPayrollCycle} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#17324A] font-semibold mb-1">Month & Year</label>
                <input
                  type="text"
                  value={cycleMonthYear}
                  onChange={(e) => setCycleMonthYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#17324A] font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={cycleStart}
                    onChange={(e) => setCycleStart(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#17324A] font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={cycleEnd}
                    onChange={(e) => setCycleEnd(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA] bg-white"
                    required
                  />
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE] text-[#667085] space-y-1">
                <div>✓ Attendance & LOP proration auto-calculated</div>
                <div>✓ Approved Overtime, Bonuses & Arrears integrated</div>
                <div>✓ Approved Expense Claims settled in reimbursement</div>
                <div>✓ Active Loan EMIs deducted</div>
                <div>✓ PF, ESIC, State PT, LWF & TDS computed</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRunCycleModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#D9E5EE] text-[#17324A] font-semibold hover:bg-[#F5F9FC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingAction}
                  className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white font-bold cursor-pointer"
                >
                  {processingAction ? 'Calculating...' : 'Run Calculation Engine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Salary Structure Adjustment */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D9E5EE] bg-white p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#17324A]">Revise Salary Structure</h3>
              <button onClick={() => setShowStructureModal(false)} className="text-[#667085] hover:text-[#17324A] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const annual = Number(structCtc);
                const monthly = annual / 12;
                const basic = Math.round(monthly * 0.5);
                const hra = Math.round(monthly * 0.25);
                const conv = 1600;
                const med = 1250;
                const special = Math.max(0, Math.round(monthly - basic - hra - conv - med));
                const pf = Math.min(1800, Math.round(basic * 0.12));

                const res = await authFetch<Response>('/api/payroll/structures', { raw: true,
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    employeeId: selectedEmpId || employees[0]?.id,
                    ctcAnnual: annual,
                    basicMonthly: basic,
                    hraMonthly: hra,
                    conveyanceMonthly: conv,
                    specialAllowanceMonthly: special,
                    medicalAllowanceMonthly: med,
                    pfEmployeeMonthly: pf,
                    ptMonthly: 200,
                    effectiveFrom: structEffectiveDate,
                  }),
                });
                if (res.ok) {
                  setShowStructureModal(false);
                  fetchStructures();
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[#17324A] font-semibold mb-1">Select Employee</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] bg-white"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#17324A] font-semibold mb-1">Annual CTC (₹)</label>
                <input
                  type="number"
                  value={structCtc}
                  onChange={(e) => setStructCtc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[#17324A] font-semibold mb-1">Effective Date</label>
                <input
                  type="date"
                  value={structEffectiveDate}
                  onChange={(e) => setStructEffectiveDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] bg-white"
                  required
                />
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#D9E5EE] text-[11px] text-[#667085] space-y-1">
                <div>Basic: 50% CTC = ₹{Math.round((Number(structCtc) / 12) * 0.5).toLocaleString('en-IN')}/mo</div>
                <div>HRA: 25% CTC = ₹{Math.round((Number(structCtc) / 12) * 0.25).toLocaleString('en-IN')}/mo</div>
                <div>PF: 12% capped at ₹1,800/mo</div>
                <div>Special Allowance absorbs balance</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStructureModal(false)}
                  className="px-4 py-2 rounded-xl bg-white border border-[#D9E5EE] text-[#17324A] font-semibold hover:bg-[#F5F9FC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#244A68] text-white font-bold cursor-pointer"
                >
                  Save & Log Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HR Verification Review */}
      {selectedDeclForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#D9E5EE] bg-white p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-[#17324A]">Review Tax Declaration</h3>
              <button onClick={() => setSelectedDeclForReview(null)} className="text-[#667085] hover:text-[#17324A] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs text-[#17324A]">
              <div>Employee: <strong>{selectedDeclForReview.employeeId}</strong></div>
              <div>Regime: <strong className="text-emerald-700">{selectedDeclForReview.regime}</strong></div>
              <div>Section 80C: {formatAmount(selectedDeclForReview.section80C)}</div>
              <div>Section 80D: {formatAmount(selectedDeclForReview.section80D)}</div>
              <div>HRA Rent: {formatAmount(selectedDeclForReview.hraExemptionRent)}</div>
              {selectedDeclForReview.proofUrls?.length > 0 && (
                <div>
                  Proof Attachment:{' '}
                  <a
                    href={selectedDeclForReview.proofUrls[0]}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 underline"
                  >
                    View Document
                  </a>
                </div>
              )}
              <div>
                <label className="block text-[#17324A] font-semibold mt-2 mb-1">Verification Remarks</label>
                <input
                  type="text"
                  placeholder="Verified against rent receipts..."
                  value={verificationRemarks}
                  onChange={(e) => setVerificationRemarks(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-[#9FC2DC] text-[#17324A] bg-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => handleVerifyTaxDecl(selectedDeclForReview.id, 'Rejected')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold border border-rose-200 hover:bg-rose-100 cursor-pointer"
              >
                Reject / Correction
              </button>
              <button
                onClick={() => handleVerifyTaxDecl(selectedDeclForReview.id, 'Approved')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer"
              >
                Approve Declaration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {selectedPayslip && (
        <PayslipModal
          payslip={selectedPayslip}
          showAmounts={true}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
