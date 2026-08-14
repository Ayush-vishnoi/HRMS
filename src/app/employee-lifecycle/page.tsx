'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  Clipboard,
  Copy,
  History,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type ApplicationRole = 'employee' | 'manager';

type LifecycleCandidate = {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  appliedOn: string;
  stage: 'Shortlisted';
  score: number;
  experience: string;
  currentRole: string;
  location: string;
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    employmentType: string;
  };
};

type LifecycleEmployee = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  roleTitle: string;
  userRole: 'employee' | 'manager' | 'admin';
  department: string;
  phone: string | null;
  avatarUrl: string | null;
  status: 'Active' | 'OnLeave' | 'Remote';
  joinDate: string;
  location: string;
  salary: number;
  managerId: string | null;
};

type AuditEmployee = Pick<
  LifecycleEmployee,
  'id' | 'employeeCode' | 'name' | 'email' | 'roleTitle' | 'department'
>;

type AuditAdministrator = {
  id: string;
  name: string;
  employeeCode: string;
};

type OnboardingAudit = {
  id: string;
  candidateId: string;
  employeeId: string;
  onboardedById: string;
  onboardedAt: string;
  employee: AuditEmployee;
  candidate: {
    id: string;
    name: string;
    email: string;
  };
  onboardedBy: AuditAdministrator;
};

type OffboardingAudit = {
  id: string;
  employeeId: string;
  offboardedById: string;
  offboardedAt: string;
  reason: string;
  employee: AuditEmployee;
  offboardedBy: AuditAdministrator;
};

type LifecycleData = {
  candidates: LifecycleCandidate[];
  employees: LifecycleEmployee[];
  onboardingHistory: OnboardingAudit[];
  offboardingHistory: OffboardingAudit[];
};

type OnboardingForm = {
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  roleTitle: string;
  department: string;
  location: string;
  joinDate: string;
  salary: string;
  managerId: string;
  userRole: ApplicationRole;
};

type Credentials = {
  employeeName: string;
  employeeCode: string;
  temporaryPassword: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function requestLifecycleData(signal?: AbortSignal): Promise<LifecycleData> {
  const response = await fetch('/api/employee-lifecycle', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<LifecycleData> | null;

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.error || 'Unable to load employee lifecycle data.');
  }

  return payload.data;
}

type LifecycleTab = 'onboarding' | 'offboarding' | 'history';

type CopyTarget = 'employeeCode' | 'temporaryPassword' | 'all';

const EMPTY_DATA: LifecycleData = {
  candidates: [],
  employees: [],
  onboardingHistory: [],
  offboardingHistory: [],
};

const DEFAULT_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

const inputClass =
  'mt-1.5 w-full rounded-xl border border-[#C8D9E6] bg-white px-3 py-2.5 text-sm text-[#17324A] outline-none transition placeholder:text-[#91A3B0] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40 disabled:bg-[#F3F7FA] disabled:text-[#8A9AAA]';

function todayForInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function emptyForm(): OnboardingForm {
  return {
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    roleTitle: '',
    department: '',
    location: '',
    joinDate: todayForInput(),
    salary: '',
    managerId: '',
    userRole: 'employee',
  };
}

function formFromCandidate(candidate: LifecycleCandidate): OnboardingForm {
  return {
    name: candidate.name,
    email: candidate.email.toLowerCase(),
    phone: candidate.phone ?? '',
    avatarUrl: candidate.avatarUrl ?? '',
    roleTitle: candidate.job.title || candidate.currentRole,
    department: candidate.job.department,
    location: candidate.job.location || candidate.location,
    joinDate: todayForInput(),
    salary: '',
    managerId: '',
    userRole: 'employee',
  };
}

function displayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Avatar({ name, src, className = 'h-11 w-11' }: { name: string; src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    return (
      <Image
        src={src}
        alt={`${name} profile`}
        width={48}
        height={48}
        unoptimized
        onError={() => setFailedSrc(src)}
        className={`${className} shrink-0 rounded-xl border border-[#D5E3EC] object-cover`}
      />
    );
  }

  return (
    <span
      aria-label={`${name} initials`}
      className={`${className} flex shrink-0 items-center justify-center rounded-xl border border-[#B9D2E3] bg-[#E8F2FA] text-xs font-bold text-[#315B76]`}
    >
      {initials(name) || 'HR'}
    </span>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-[#B9D2E3] bg-[#F8FBFD] p-7 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E5F0F7] text-[#315B76]">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-bold text-[#17324A]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#6F8190]">{detail}</p>
    </div>
  );
}

function ModalShell({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0C2233]/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#B9D2E3] bg-white shadow-2xl"
      >
        {children}
      </div>
    </div>
  );
}

export default function EmployeeLifecyclePage() {
  const { currentUser } = useHRMS();
  const searchParams = useSearchParams();
  const requestedCandidateId = searchParams.get('candidateId');
  const handledCandidateIdRef = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<LifecycleTab>('onboarding');
  const [data, setData] = useState<LifecycleData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [form, setForm] = useState<OnboardingForm>(emptyForm);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copiedTarget, setCopiedTarget] = useState<CopyTarget | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedOffboardingEmployee, setSelectedOffboardingEmployee] = useState<LifecycleEmployee | null>(null);
  const [offboardingReason, setOffboardingReason] = useState('');
  const [isOffboarding, setIsOffboarding] = useState(false);

  const managers = useMemo(
    () => data.employees.filter((employee) => ['manager', 'admin'].includes(employee.userRole)),
    [data.employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.trim().toLowerCase();
    if (!query) return data.employees;
    return data.employees.filter((employee) =>
      [
        employee.name,
        employee.employeeCode,
        employee.email,
        employee.roleTitle,
        employee.department,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [data.employees, employeeQuery]);

  const applyLifecycleData = useCallback((nextData: LifecycleData) => {
    setData(nextData);
    setLoadError('');

    if (requestedCandidateId && handledCandidateIdRef.current !== requestedCandidateId) {
      handledCandidateIdRef.current = requestedCandidateId;
      const candidate = nextData.candidates.find((item) => item.id === requestedCandidateId);
      if (candidate) {
        setActiveTab('onboarding');
        setSelectedCandidateId(candidate.id);
        setForm(formFromCandidate(candidate));
        setIsOnboardingOpen(true);
      }
    }
  }, [requestedCandidateId]);

  const refreshLifecycleData = async () => {
    setIsRefreshing(true);
    setLoadError('');

    try {
      applyLifecycleData(await requestLifecycleData());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load employee lifecycle data.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser.userRole !== 'admin') return;

    const controller = new AbortController();
    void requestLifecycleData(controller.signal)
      .then((nextData) => applyLifecycleData(nextData))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : 'Unable to load employee lifecycle data.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [currentUser.userRole, applyLifecycleData]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const openOnboarding = (candidate: LifecycleCandidate) => {
    setSelectedCandidateId(candidate.id);
    setForm(formFromCandidate(candidate));
    setIsOnboardingOpen(true);
    setLoadError('');
  };

  const closeOnboarding = () => {
    if (isOnboarding) return;
    setIsOnboardingOpen(false);
    setSelectedCandidateId('');
    setForm(emptyForm());
  };

  const submitOnboarding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCandidateId || isOnboarding) return;

    const salary = Number(form.salary);
    if (!Number.isFinite(salary) || salary < 0) {
      setLoadError('Enter a valid salary amount.');
      return;
    }

    setIsOnboarding(true);
    setLoadError('');

    try {
      const response = await fetch('/api/employee-lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'onboard',
          candidateId: selectedCandidateId,
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          avatarUrl: form.avatarUrl || null,
          roleTitle: form.roleTitle,
          department: form.department,
          location: form.location,
          joinDate: form.joinDate,
          salary,
          managerId: form.managerId || null,
          userRole: form.userRole,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
        employee: LifecycleEmployee;
        credentials: {
          employeeCode: string;
          temporaryPassword: string;
        };
      }> | null;

      if (!response.ok || !payload?.success || !payload.data?.credentials) {
        throw new Error(payload?.error || 'Unable to onboard this candidate.');
      }

      setCredentials({
        employeeName: payload.data.employee.name,
        employeeCode: payload.data.credentials.employeeCode,
        temporaryPassword: payload.data.credentials.temporaryPassword,
      });
      setIsOnboardingOpen(false);
      setSelectedCandidateId('');
      setForm(emptyForm());
      await refreshLifecycleData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to onboard this candidate.');
    } finally {
      setIsOnboarding(false);
    }
  };

  const submitOffboarding = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOffboardingEmployee || isOffboarding) return;

    const reason = offboardingReason.trim();
    if (reason.length < 5) {
      setLoadError('Offboarding reason must contain at least 5 characters.');
      return;
    }

    setIsOffboarding(true);
    setLoadError('');

    try {
      const response = await fetch('/api/employee-lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          action: 'offboard',
          employeeId: selectedOffboardingEmployee.id,
          reason,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiEnvelope<{
        revokedSessions: number;
      }> | null;

      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'Unable to offboard this employee.');
      }

      const revokedSessions = payload.data.revokedSessions ?? 0;
      setNotice(
        `${selectedOffboardingEmployee.name} was offboarded. ${revokedSessions} active session${revokedSessions === 1 ? '' : 's'} revoked.`,
      );
      setSelectedOffboardingEmployee(null);
      setOffboardingReason('');
      await refreshLifecycleData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to offboard this employee.');
    } finally {
      setIsOffboarding(false);
    }
  };

  const copyCredential = async (target: CopyTarget) => {
    if (!credentials) return;

    const text =
      target === 'employeeCode'
        ? credentials.employeeCode
        : target === 'temporaryPassword'
          ? credentials.temporaryPassword
          : `Employee: ${credentials.employeeName}\nCompany ID: ${credentials.employeeCode}\nTemporary password: ${credentials.temporaryPassword}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 1800);
    } catch {
      setNotice('Clipboard permission was denied. Select and copy the credential manually.');
    }
  };

  if (currentUser.userRole !== 'admin') {
    return (
      <div className="flex min-h-[65vh] items-center justify-center">
        <div className="max-w-md rounded-2xl border border-[#D5E3EC] bg-white p-8 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F2FA] text-[#17324A]">
            <ShieldAlert className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-lg font-bold text-[#17324A]">HR Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-[#667C8D]">
            Employee onboarding, credentials, and offboarding records are restricted to HR administrators.
          </p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#315B76]">
            Return to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-[#315B76] bg-gradient-to-br from-[#17324A] via-[#234B68] to-[#315B76] p-5 text-white shadow-sm md:p-7">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#B0D0EA]/15" />
        <div className="absolute -bottom-16 right-40 h-40 w-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D5E8F5]">
              <ShieldCheck className="h-4 w-4" />
              Secure HR operations
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Employee lifecycle</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#DCEAF4]">
              Convert shortlisted candidates into secure employee accounts and revoke access with an immutable offboarding record.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
              <p className="text-lg font-bold">{data.candidates.length}</p>
              <p className="mt-0.5 text-[10px] text-[#DCEAF4]">Ready to onboard</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
              <p className="text-lg font-bold">{data.employees.length}</p>
              <p className="mt-0.5 text-[10px] text-[#DCEAF4]">Active workforce</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur-sm">
              <p className="text-lg font-bold">{data.onboardingHistory.length + data.offboardingHistory.length}</p>
              <p className="mt-0.5 text-[10px] text-[#DCEAF4]">Recent audits</p>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </span>
          <button type="button" onClick={() => setLoadError('')} aria-label="Dismiss error" className="rounded-md p-1 hover:bg-red-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-[#D5E3EC] bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid flex-1 grid-cols-3 gap-1">
            {([
              ['onboarding', 'Onboarding', UserPlus],
              ['offboarding', 'Offboarding', UserMinus],
              ['history', 'Audit history', History],
            ] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  activeTab === tab
                    ? 'bg-[#17324A] text-white shadow-sm'
                    : 'text-[#607789] hover:bg-[#EEF6FB] hover:text-[#17324A]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void refreshLifecycleData()}
            disabled={isRefreshing}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#C8D9E6] bg-[#F8FBFD] px-4 text-xs font-semibold text-[#315B76] hover:bg-[#EAF3F9] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </section>

      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-[#D5E3EC] bg-white">
          <div className="text-center text-[#56758A]">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin" />
            <p className="mt-3 text-xs font-semibold">Loading secure lifecycle records...</p>
          </div>
        </div>
      ) : activeTab === 'onboarding' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#66859B]">Recruitment handoff</p>
              <h2 className="mt-1 text-lg font-bold text-[#17324A]">Shortlisted candidates</h2>
              <p className="mt-1 text-xs text-[#6F8190]">Only exact Shortlisted candidates without an employee account appear here.</p>
            </div>
            <Link href="/recruitment" className="inline-flex items-center gap-2 self-start rounded-xl border border-[#B9D2E3] bg-white px-3 py-2 text-xs font-semibold text-[#315B76] hover:bg-[#EEF6FB] sm:self-auto">
              <BriefcaseBusiness className="h-4 w-4" />
              Open recruitment
            </Link>
          </div>

          {data.candidates.length === 0 ? (
            <EmptyState
              icon={BadgeCheck}
              title="No candidates waiting for onboarding"
              detail="Shortlist a candidate in Recruitment. They will appear here automatically when they have not already been onboarded."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.candidates.map((candidate) => (
                <article key={candidate.id} className="flex flex-col rounded-2xl border border-[#D5E3EC] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9FC2DC] hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <Avatar name={candidate.name} src={candidate.avatarUrl} className="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-[#17324A]">{candidate.name}</h3>
                          <p className="mt-0.5 truncate text-[11px] text-[#61798B]">{candidate.email}</p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold uppercase text-emerald-700">
                          Shortlisted
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl bg-[#F6FAFC] p-3 text-xs text-[#5E778A]">
                    <p className="flex items-center gap-2"><BriefcaseBusiness className="h-3.5 w-3.5 text-[#315B76]" /><span className="font-semibold text-[#17324A]">{candidate.job.title}</span></p>
                    <p className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-[#315B76]" />{candidate.job.department}</p>
                    <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#315B76]" />{candidate.job.location || candidate.location}</p>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] text-[#738897]">
                    <span>{candidate.experience || 'Experience not specified'}</span>
                    <span className="font-bold text-[#315B76]">Match {candidate.score}%</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => openOnboarding(candidate)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#17324A] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#315B76]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Review & onboard
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : activeTab === 'offboarding' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#66859B]">Access revocation</p>
              <h2 className="mt-1 text-lg font-bold text-[#17324A]">Current employees</h2>
              <p className="mt-1 text-xs text-[#6F8190]">Offboarding denies future login and revokes all database sessions immediately.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8094A3]" />
              <input
                type="search"
                value={employeeQuery}
                onChange={(event) => setEmployeeQuery(event.target.value)}
                placeholder="Search employee, email, or ID"
                className="w-full rounded-xl border border-[#C8D9E6] bg-white py-2.5 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40"
              />
            </div>
          </div>

          {filteredEmployees.length === 0 ? (
            <EmptyState icon={UsersRound} title="No employees found" detail="Change the search phrase or refresh the lifecycle data." />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#D5E3EC] bg-white shadow-sm">
              <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(130px,.8fr)_auto] gap-4 border-b border-[#DCE7EE] bg-[#F6FAFC] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#718696] md:grid">
                <span>Employee</span><span>Role & department</span><span>Status</span><span className="text-right">Action</span>
              </div>
              <div className="divide-y divide-[#E2EBF1]">
                {filteredEmployees.map((employee) => {
                  const isSelf = employee.id === currentUser.id;
                  return (
                    <article key={employee.id} className="grid gap-3 px-4 py-4 transition hover:bg-[#FAFCFD] md:grid-cols-[minmax(220px,1.5fr)_minmax(160px,1fr)_minmax(130px,.8fr)_auto] md:items-center md:gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={employee.name} src={employee.avatarUrl} />
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-bold text-[#17324A]">{employee.name}</h3>
                          <p className="mt-0.5 truncate text-[11px] text-[#6C8190]">{employee.email}</p>
                          <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#315B76]">{employee.employeeCode}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#315B76]">{employee.roleTitle}</p>
                        <p className="mt-1 text-[11px] text-[#748795]">{employee.department}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{employee.status}</span>
                        <span className="rounded-full border border-[#D5E3EC] bg-[#F6FAFC] px-2.5 py-1 text-[10px] font-semibold capitalize text-[#5D7587]">{employee.userRole}</span>
                      </div>
                      <button
                        type="button"
                        disabled={isSelf}
                        title={isSelf ? 'You cannot offboard your own account' : `Offboard ${employee.name}`}
                        onClick={() => {
                          setSelectedOffboardingEmployee(employee);
                          setOffboardingReason('');
                          setLoadError('');
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:border-[#DCE5EB] disabled:bg-[#F5F7F8] disabled:text-[#9AA8B1] md:justify-self-end"
                      >
                        <UserMinus className="h-4 w-4" />
                        {isSelf ? 'Current admin' : 'Offboard'}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#D5E3EC] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Account creation</p>
                <h2 className="mt-1 text-base font-bold text-[#17324A]">Onboarding history</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{data.onboardingHistory.length} records</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.onboardingHistory.length === 0 ? (
                <EmptyState icon={UserPlus} title="No onboarding records" detail="Completed onboarding audits will be shown here." />
              ) : data.onboardingHistory.map((audit) => (
                <article key={audit.id} className="rounded-xl border border-[#DFE9EF] bg-[#FAFCFD] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[#17324A]">{audit.employee.name}</h3>
                          <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#315B76]">{audit.employee.employeeCode}</p>
                        </div>
                        <span className="text-[10px] text-[#7C8F9C]">{displayDate(audit.onboardedAt)}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-[#687F90]">{audit.employee.roleTitle} · {audit.employee.department}</p>
                      <p className="mt-1 text-[10px] text-[#8495A1]">Processed by {audit.onboardedBy.name} ({audit.onboardedBy.employeeCode})</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D5E3EC] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">Access termination</p>
                <h2 className="mt-1 text-base font-bold text-[#17324A]">Offboarding history</h2>
              </div>
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-700">{data.offboardingHistory.length} records</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.offboardingHistory.length === 0 ? (
                <EmptyState icon={UserMinus} title="No offboarding records" detail="Completed offboarding audits and their reasons will be shown here." />
              ) : data.offboardingHistory.map((audit) => (
                <article key={audit.id} className="rounded-xl border border-[#DFE9EF] bg-[#FAFCFD] p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"><LockKeyhole className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[#17324A]">{audit.employee.name}</h3>
                          <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#315B76]">{audit.employee.employeeCode}</p>
                        </div>
                        <span className="text-[10px] text-[#7C8F9C]">{displayDate(audit.offboardedAt)}</span>
                      </div>
                      <p className="mt-2 rounded-lg border border-red-100 bg-red-50/70 px-2.5 py-2 text-[11px] leading-5 text-red-800">{audit.reason}</p>
                      <p className="mt-2 text-[10px] text-[#8495A1]">Processed by {audit.offboardedBy.name} ({audit.offboardedBy.employeeCode})</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {isOnboardingOpen && (
        <ModalShell labelledBy="onboarding-dialog-title">
          <form onSubmit={submitOnboarding}>
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#DCE7EE] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#66859B]">Editable employee profile</p>
                <h2 id="onboarding-dialog-title" className="mt-1 text-lg font-bold text-[#17324A]">Complete onboarding</h2>
                <p className="mt-1 text-xs text-[#6D8190]">Review all details before the secure account is created.</p>
              </div>
              <button type="button" onClick={closeOnboarding} disabled={isOnboarding} aria-label="Close onboarding dialog" className="rounded-lg p-2 text-[#718696] hover:bg-[#EEF5F9] hover:text-[#17324A]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3 rounded-xl border border-[#C8DDEB] bg-[#F1F7FB] p-3">
                <Avatar name={form.name || 'Candidate'} src={form.avatarUrl || DEFAULT_AVATAR_URL} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#17324A]">{form.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#60798B]">{form.email}</p>
                </div>
                <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Shortlisted</span>
              </div>

              <fieldset>
                <legend className="flex items-center gap-2 text-xs font-bold text-[#17324A]"><Mail className="h-4 w-4 text-[#315B76]" />Personal & contact details</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-[#405F75]">Full name<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Work email<input required type="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Phone<input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} placeholder="Optional" /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Avatar URL<input type="url" maxLength={2048} value={form.avatarUrl} onChange={(event) => setForm((current) => ({ ...current, avatarUrl: event.target.value }))} className={inputClass} placeholder="Optional HTTPS URL" /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex items-center gap-2 text-xs font-bold text-[#17324A]"><BriefcaseBusiness className="h-4 w-4 text-[#315B76]" />Employment details</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-[11px] font-semibold text-[#405F75]">Designation<input required minLength={2} maxLength={100} value={form.roleTitle} onChange={(event) => setForm((current) => ({ ...current, roleTitle: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Department<input required minLength={2} maxLength={80} value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Location<input required minLength={2} maxLength={120} value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Joining date<input required type="date" value={form.joinDate} onChange={(event) => setForm((current) => ({ ...current, joinDate: event.target.value }))} className={inputClass} /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Annual salary (INR)<input required type="number" min="0" max="1000000000" step="1" value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} className={inputClass} placeholder="e.g. 900000" /></label>
                  <label className="text-[11px] font-semibold text-[#405F75]">Reporting manager<select value={form.managerId} onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))} className={inputClass}><option value="">No reporting manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name} · {manager.roleTitle}</option>)}</select></label>
                  <label className="text-[11px] font-semibold text-[#405F75] sm:col-span-2">Application access role<select value={form.userRole} onChange={(event) => setForm((current) => ({ ...current, userRole: event.target.value as ApplicationRole }))} className={inputClass}><option value="employee">Employee · Self-service access</option><option value="manager">Manager · Team management access</option></select></label>
                </div>
              </fieldset>

              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                <p>A unique company ID and secure temporary password will be generated after the transaction commits. The password is displayed once and is never stored in plaintext.</p>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-[#DCE7EE] bg-white px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={closeOnboarding} disabled={isOnboarding} className="rounded-xl border border-[#C8D9E6] bg-white px-4 py-2.5 text-xs font-semibold text-[#315B76] hover:bg-[#F2F7FA] disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={isOnboarding} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-60">
                {isOnboarding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {isOnboarding ? 'Creating secure account...' : 'Create employee account'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {credentials && (
        <ModalShell labelledBy="credentials-dialog-title">
          <div className="p-5 sm:p-6">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-7 w-7" /></span>
            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">Onboarding completed</p>
              <h2 id="credentials-dialog-title" className="mt-1 text-xl font-bold text-[#17324A]">Save credentials now</h2>
              <p className="mt-2 text-sm leading-6 text-[#667D8E]">Secure access was created for <strong className="text-[#17324A]">{credentials.employeeName}</strong>.</p>
            </div>

            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
              <p className="flex items-start gap-2 font-semibold"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />This temporary password is shown only once. Closing this window permanently removes it from the HR interface.</p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-[#D5E3EC] bg-[#F8FBFD] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#748A9A]">Company employee ID</p><p className="mt-1 break-all font-mono text-sm font-bold text-[#17324A]">{credentials.employeeCode}</p></div>
                  <button type="button" onClick={() => void copyCredential('employeeCode')} aria-label="Copy company employee ID" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C8D9E6] bg-white text-[#315B76] hover:bg-[#EAF3F9]">{copiedTarget === 'employeeCode' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
                </div>
              </div>
              <div className="rounded-xl border border-[#D5E3EC] bg-[#F8FBFD] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#748A9A]">One-time temporary password</p><p className="mt-1 break-all font-mono text-sm font-bold text-[#17324A]">{credentials.temporaryPassword}</p></div>
                  <button type="button" onClick={() => void copyCredential('temporaryPassword')} aria-label="Copy temporary password" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C8D9E6] bg-white text-[#315B76] hover:bg-[#EAF3F9]">{copiedTarget === 'temporaryPassword' ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>
                </div>
              </div>
            </div>

            <button type="button" onClick={() => void copyCredential('all')} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#B9D2E3] bg-[#EEF6FB] px-4 py-2.5 text-xs font-semibold text-[#17324A] hover:bg-[#DCECF7]">
              {copiedTarget === 'all' ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
              {copiedTarget === 'all' ? 'Credentials copied' : 'Copy both credentials'}
            </button>
            <button type="button" onClick={() => { setCredentials(null); setCopiedTarget(null); setNotice('Onboarding completed. The one-time password has been cleared from this screen.'); }} className="mt-2 w-full rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#315B76]">I have saved the credentials</button>
          </div>
        </ModalShell>
      )}

      {selectedOffboardingEmployee && (
        <ModalShell labelledBy="offboarding-dialog-title">
          <form onSubmit={submitOffboarding}>
            <div className="flex items-start justify-between gap-4 border-b border-[#F0D5D5] bg-red-50/70 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-red-700">Irreversible access action</p>
                <h2 id="offboarding-dialog-title" className="mt-1 text-lg font-bold text-[#17324A]">Offboard employee</h2>
              </div>
              <button type="button" disabled={isOffboarding} onClick={() => { setSelectedOffboardingEmployee(null); setOffboardingReason(''); }} aria-label="Close offboarding dialog" className="rounded-lg p-2 text-[#718696] hover:bg-red-100 hover:text-red-700"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-xl border border-[#D5E3EC] bg-[#F8FBFD] p-3">
                <Avatar name={selectedOffboardingEmployee.name} src={selectedOffboardingEmployee.avatarUrl} />
                <div className="min-w-0"><p className="truncate text-sm font-bold text-[#17324A]">{selectedOffboardingEmployee.name}</p><p className="mt-0.5 text-[11px] text-[#687F90]">{selectedOffboardingEmployee.roleTitle} · {selectedOffboardingEmployee.department}</p><p className="mt-1 font-mono text-[10px] font-semibold text-[#315B76]">{selectedOffboardingEmployee.employeeCode}</p></div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                <p className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><span>The employee status will become <strong>Offboarded</strong>, future login will be denied, and every active database session will be revoked.</span></p>
              </div>

              <label className="block text-xs font-bold text-[#17324A]">Reason for offboarding <span className="text-red-600">*</span><textarea required minLength={5} maxLength={2000} rows={5} value={offboardingReason} onChange={(event) => setOffboardingReason(event.target.value)} className={`${inputClass} resize-y`} placeholder="Document the business reason for offboarding (minimum 5 characters)" /><span className="mt-1.5 flex justify-between text-[10px] font-normal text-[#7C8F9C]"><span>This reason is stored in the immutable HR audit.</span><span>{offboardingReason.length}/2000</span></span></label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-[#DCE7EE] px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" disabled={isOffboarding} onClick={() => { setSelectedOffboardingEmployee(null); setOffboardingReason(''); }} className="rounded-xl border border-[#C8D9E6] bg-white px-4 py-2.5 text-xs font-semibold text-[#315B76] hover:bg-[#F2F7FA] disabled:opacity-60">Cancel</button>
              <button type="submit" disabled={isOffboarding || offboardingReason.trim().length < 5} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">{isOffboarding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}{isOffboarding ? 'Revoking access...' : 'Confirm offboarding'}</button>
            </div>
          </form>
        </ModalShell>
      )}

      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-[90] flex max-w-md items-start gap-2 rounded-xl border border-[#B9D2E3] bg-white px-4 py-3 text-xs font-semibold leading-5 text-[#17324A] shadow-xl">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>{notice}</span>
        </div>
      )}
    </div>
  );
}
