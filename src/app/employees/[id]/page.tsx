'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DoorOpen,
  FileCheck,
  FileText,
  GraduationCap,
  HeartHandshake,
  History,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

export default function Employee360Page() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.id as string;
  const { currentUser } = useHRMS();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'lifecycle'
    | 'attendance'
    | 'compensation'
    | 'performance'
    | 'skills'
    | 'training'
    | 'benefits'
    | 'assets'
    | 'documents'
    | 'exit'
  >('overview');

  useEffect(() => {
    if (!employeeId) return;

    const fetch360 = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch<Response>(`/api/employees/${encodeURIComponent(employeeId)}/360?role=${encodeURIComponent(
            currentUser.userRole
          )}&currentUserId=${encodeURIComponent(currentUser.id)}`, { raw: true });
        const json = await res.json();
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load employee 360 profile');
        }
      } catch (err: any) {
        setError(err.message || 'Error loading employee 360');
      } finally {
        setLoading(false);
      }
    };

    fetch360();
  }, [employeeId, currentUser.id, currentUser.userRole]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#17324A] border-t-transparent" />
          <p className="text-xs font-semibold text-[#667085]">Loading Employee 360 Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.employee) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center max-w-md">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-rose-600" />
          <h2 className="text-base font-bold text-rose-900">Access Restricted / Not Found</h2>
          <p className="mt-1 text-xs text-rose-700">{error || 'Employee record does not exist.'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-[#17324A] text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const {
    employee,
    attendanceSummary = [],
    leaveBalances = [],
    leaveRequests = [],
    payslips = [],
    kras = [],
    assets = [],
    documents = [],
    salaryStructure,
    skills = [],
    courseEnrollments = [],
    benefitEnrollments = [],
    exitRequest,
    salaryRevisions = [],
    disciplinaryWarnings = [],
    employmentProfile,
    changeRequests = [],
    recognitions = [],
    goals = [],
    kpis = [],
    reviewAssignments = [],
    competencyAssessments = [],
    pips = [],
    careerAspirations = null,
    feedback = [],
  } = data;

  const TABS = [
    { key: 'overview', label: 'Overview & Profile', icon: User },
    { key: 'lifecycle', label: 'Lifecycle & Career History', icon: History },
    { key: 'attendance', label: 'Attendance & Leaves', icon: Clock },
    { key: 'compensation', label: 'Compensation & Payslips', icon: CreditCard },
    { key: 'performance', label: 'Performance & KRAs', icon: Target },
    { key: 'skills', label: 'Skills & Competencies', icon: Sparkles },
    { key: 'training', label: 'Training & LMS', icon: GraduationCap },
    { key: 'benefits', label: 'Benefits & Insurance', icon: HeartHandshake },
    { key: 'assets', label: 'Assigned Assets', icon: Archive },
    { key: 'documents', label: 'Documents & KYC', icon: FileText },
    { key: 'exit', label: 'Exit & Offboarding', icon: DoorOpen },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-xs font-bold text-[#52677A] hover:text-[#17324A] cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </button>

      {/* Header Profile Card */}
      <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={
                employee.avatarUrl ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
              }
              alt={employee.name}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-[#B0D0EA] shadow-xs"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-[#17324A] tracking-tight">
                  {employee.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF2F8] text-[#17324A] border border-[#B0D0EA]">
                  {employee.employeeCode}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    employee.status === 'Active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : employee.status === 'Remote'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {employee.status}
                </span>
              </div>

              <p className="text-xs font-semibold text-[#52677A]">
                {employee.roleTitle} · <span className="text-[#17324A]">{employee.department}</span>
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#667085] pt-1">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> {employee.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {employee.phone || 'N/A'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {employee.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Joined {employee.joinDate}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
              REPORTING MANAGER
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#17324A]">
                {employee.manager ? employee.manager.name : 'Executive Board'}
              </span>
              {employee.manager && (
                <span className="text-[10px] text-[#667085]">
                  ({employee.manager.roleTitle})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#D9E5EE] pb-2 scrollbar-none">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#17324A] text-white shadow-sm'
                  : 'text-[#52677A] hover:bg-[#EAF2F8]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Employment & Identity Information</h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Official Email:</span>
                <span className="font-bold text-[#17324A]">{employee.email}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Phone:</span>
                <span className="font-bold text-[#17324A]">{employee.phone || 'N/A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Department:</span>
                <span className="font-bold text-[#17324A]">{employee.department}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Role Designation:</span>
                <span className="font-bold text-[#17324A]">{employee.roleTitle}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Base Location:</span>
                <span className="font-bold text-[#17324A]">{employee.location}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">System Role (RBAC):</span>
                <span className="font-bold text-[#17324A] uppercase">{employee.userRole}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Direct Reports</h2>
            <div className="space-y-2.5">
              {employee.directReports?.map((dr: any) => (
                <div key={dr.id} className="p-3 rounded-xl border border-[#EAF2F8] bg-[#F8FAFC] space-y-1">
                  <p className="font-bold text-xs text-[#17324A]">{dr.name}</p>
                  <p className="text-[10px] text-[#667085]">{dr.roleTitle} · {dr.department}</p>
                </div>
              ))}
              {(!employee.directReports || employee.directReports.length === 0) && (
                <p className="text-xs text-[#667085]">No direct reports assigned.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Lifecycle & Career History */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6">
          {/* Employment Profile & Probation Milestone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#667085]">LIFECYCLE STATUS</span>
              <div className="text-lg font-black text-[#17324A]">
                {employmentProfile?.lifecycle_status || 'Active Full-Time'}
              </div>
              <p className="text-[11px] text-[#667085]">
                Confirmation Date: {employmentProfile?.confirmation_date ? new Date(employmentProfile.confirmation_date).toLocaleDateString() : 'Confirmed'}
              </p>
            </div>
            <div className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#667085]">EMPLOYMENT TYPE</span>
              <div className="text-lg font-black text-[#17324A]">
                {employmentProfile?.employment_type || 'Full Time'} · {employmentProfile?.work_mode || 'Office'}
              </div>
              <p className="text-[11px] text-[#667085]">Notice Period: {employmentProfile?.notice_period_days || 60} Days</p>
            </div>
            <div className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-1">
              <span className="text-[10px] font-bold uppercase text-[#667085]">FORMAL RECOGNITIONS</span>
              <div className="text-lg font-black text-amber-600 flex items-center gap-1.5">
                <Award className="h-5 w-5" /> {recognitions.length} Kudos / Badges
              </div>
              <p className="text-[11px] text-[#667085]">Awarded by peers & managers</p>
            </div>
          </div>

          {/* Salary Revision History Timeline */}
          <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#17324A] mb-1">Salary Revision & CTC History</h2>
            <p className="text-xs text-[#667085] mb-4">Immutable historical timeline of salary adjustments, promotions, and annual increments.</p>

            <div className="space-y-3">
              {salaryRevisions.length === 0 ? (
                <p className="text-xs text-[#8FAEC5] py-4">No historical salary revisions logged yet.</p>
              ) : (
                salaryRevisions.map((rev: any) => (
                  <div key={rev.id} className="p-3.5 rounded-xl border border-[#E2ECEF] bg-[#FBFDFE] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-[#17324A] flex items-center gap-2">
                        <Coins className="h-4 w-4 text-[#23587E]" />
                        <span>{rev.revisionType}</span>
                        <span className="text-[10px] text-[#667085]">· Effective: {rev.effectiveDate}</span>
                      </div>
                      <div className="text-[11px] text-[#4B6882]">Reason: {rev.reason}</div>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-[#E2ECEF]">
                      <span className="text-xs font-semibold text-[#667085]">₹{Number(rev.previousCtcAnnual).toLocaleString('en-IN')}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-extrabold text-emerald-700">₹{Number(rev.newCtcAnnual).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Disciplinary Warnings (RBAC Sensitive) */}
          {disciplinaryWarnings.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-sm">
              <h2 className="text-base font-bold text-rose-950 mb-1 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" /> Disciplinary & Compliance Record
              </h2>
              <p className="text-xs text-rose-800 mb-4">Confidential formal notices and corrective action requests on file.</p>

              <div className="space-y-3">
                {disciplinaryWarnings.map((w: any) => (
                  <div key={w.id} className="p-3.5 rounded-xl border border-rose-200 bg-white space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-rose-950">
                      <span>{w.type} Notice ({w.severity} Severity)</span>
                      <span className="text-[10px] text-rose-700">{w.incidentDate}</span>
                    </div>
                    <p className="text-[11px] text-rose-900">{w.reason}</p>
                    <p className="text-[10px] font-semibold text-[#4B6882]">Required Action: {w.actionRequired}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Attendance & Leaves */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {leaveBalances.map((lb: any) => (
              <div key={lb.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-1">
                <span className="text-[10px] font-bold uppercase text-[#667085]">{lb.leaveType || lb.type} LEAVE</span>
                <div className="text-2xl font-black text-[#17324A]">
                  {lb.remaining} <span className="text-xs font-semibold text-[#667085]">/ {lb.total} Days</span>
                </div>
                <p className="text-[11px] text-[#667085]">Used: {lb.used} Days</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#17324A] mb-4">Recent Attendance Logs</h2>
            <div className="space-y-2">
              {attendanceSummary.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#EAF2F8]"
                >
                  <span className="font-bold text-xs text-[#17324A]">{att.date}</span>
                  <div className="flex items-center gap-4 text-xs text-[#667085]">
                    <span>In: {att.checkIn || '09:30 AM'}</span>
                    <span>Out: {att.checkOut || '06:30 PM'}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                      {att.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Compensation */}
      {activeTab === 'compensation' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Current Salary Structure (CTC Breakdown)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Annual CTC:</span>
                <span className="font-bold text-[#17324A]">₹{Number(employee.salary).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Monthly Basic:</span>
                <span className="font-bold text-[#17324A]">₹{Number(salaryStructure?.basicMonthly || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Monthly HRA:</span>
                <span className="font-bold text-[#17324A]">₹{Number(salaryStructure?.hraMonthly || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC]">
                <span className="text-[#667085] block">Special Allowance:</span>
                <span className="font-bold text-[#17324A]">₹{Number(salaryStructure?.specialAllowanceMonthly || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-[#17324A] mb-4">Historical Disbursed Payslips</h2>
            <div className="space-y-2">
              {payslips.map((ps: any) => (
                <div key={ps.id} className="p-3.5 rounded-xl border border-[#E2ECEF] bg-[#F8FAFC] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-[#17324A]">{ps.monthYear}</div>
                    <div className="text-[10px] text-[#667085]">Disbursed: {ps.paymentDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-extrabold text-emerald-700">₹{Number(ps.netPayable).toLocaleString('en-IN')}</div>
                    <div className="text-[10px] text-[#667085]">Net Take-Home</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Active PIP Alert if present */}
          {pips && pips.length > 0 && pips.some((p: any) => p.status === 'Active') && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-rose-600 px-2 py-0.5 font-bold text-white text-[10px]">Active PIP</span>
                <span>Active Performance Improvement Plan in progress. Review date: {new Date(pips[0].review_date).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Objectives & OKRs */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Active Objectives & Key Results (OKRs)</h2>
            {goals && goals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g: any) => (
                  <div key={g.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#17324A]">{g.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        {g.progress || 0}%
                      </span>
                    </div>
                    {g.description && <p className="text-xs text-[#667085]">{g.description}</p>}
                    <div className="w-full bg-[#EAF2F8] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${g.progress || 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[#667085]">No active individual OKRs configured.</div>
            )}
          </div>

          {/* Quantitative KPIs */}
          {kpis && kpis.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
              <h2 className="text-base font-bold text-[#17324A]">Quantitative & System-Calculated KPIs</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {kpis.map((kpi: any) => (
                  <div key={kpi.id} className="p-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC]">
                    <div className="flex items-center justify-between text-xs font-bold text-[#17324A]">
                      <span>{kpi.name}</span>
                      <span className="text-indigo-600">{kpi.actual} {kpi.unit}</span>
                    </div>
                    <p className="text-[10px] text-[#667085] mt-1">Target: {kpi.target} {kpi.unit} ({kpi.source_module})</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Result Areas (KRAs) */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Assigned Deliverables (KRAs)</h2>
            <div className="space-y-3">
              {kras.map((kra: any) => (
                <div key={kra.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#17324A]">{kra.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                      {kra.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">{kra.description}</p>
                  <div className="w-full bg-[#EAF2F8] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#17324A] h-full" style={{ width: `${kra.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Skills & Competencies */}
      {activeTab === 'skills' && (
        <div className="space-y-6">
          {/* Career Aspirations Card */}
          {careerAspirations && (
            <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-200 shadow-sm space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Declared Career Aspiration</span>
              <h3 className="text-base font-bold text-indigo-950">Target Role: {careerAspirations.target_role} ({careerAspirations.target_timeline})</h3>
              {careerAspirations.skills_to_develop?.length > 0 && (
                <p className="text-xs text-indigo-800">Target Skills: {careerAspirations.skills_to_develop.join(', ')}</p>
              )}
            </div>
          )}

          {/* Verified Skills */}
          <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#17324A]">Verified Skills Matrix</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {skills.map((s: any) => (
                <div key={s.id} className="p-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-1">
                  <p className="font-bold text-xs text-[#17324A]">{s.skill?.name || 'Skill'}</p>
                  <p className="text-[10px] text-[#667085]">Level: {s.proficiency || s.proficiencyLevel || 'Intermediate'} · {s.yearsExp || s.yearsOfExperience || 2}y exp</p>
                </div>
              ))}
            </div>
          </div>

          {/* Core Competencies Assessments */}
          {competencyAssessments && competencyAssessments.length > 0 && (
            <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
              <h2 className="text-base font-bold text-[#17324A]">Core Competency Assessments</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competencyAssessments.map((ca: any) => (
                  <div key={ca.id} className="p-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#17324A]">{ca.performance_competencies?.name || 'Competency'}</p>
                      {ca.comments && <p className="text-[10px] text-[#667085] line-clamp-1">{ca.comments}</p>}
                    </div>
                    <span className="font-bold text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      {Number(ca.rating).toFixed(1)} / 5.0
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Training */}
      {activeTab === 'training' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">LMS Course Enrollments & Certifications</h2>
          <div className="space-y-3">
            {courseEnrollments.map((ce: any) => (
              <div key={ce.id} className="p-3 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#17324A]">{ce.course?.title || 'Course'}</p>
                  <p className="text-[10px] text-[#667085]">{ce.course?.category} · Score: {ce.scorePercentage}%</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  {ce.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: Benefits */}
      {activeTab === 'benefits' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">Health Benefits & Dependent Coverage</h2>
          <div className="space-y-3">
            {benefitEnrollments.map((be: any) => (
              <div key={be.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#17324A]">{be.plan?.name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                    Active Coverage
                  </span>
                </div>
                <p className="text-xs text-[#667085]">Coverage: ₹{Number(be.plan?.coverageAmount || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 9: Assets */}
      {activeTab === 'assets' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">Assigned Physical & IT Hardware Assets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map((a: any) => (
              <div key={a.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-white space-y-1">
                <span className="font-bold text-xs text-[#17324A]">{a.name}</span>
                <p className="text-[11px] text-[#667085]">Asset Tag: {a.assetTag}</p>
                <p className="text-[11px] text-[#667085]">Serial: {a.serialNumber}</p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#EAF2F8] text-[#17324A]">
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 10: Documents */}
      {activeTab === 'documents' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">KYC & Employment Documents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((d: any) => (
              <div key={d.id} className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-[#17324A]">{d.name}</p>
                  <p className="text-[10px] text-[#667085]">{d.type} · {d.size}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 11: Exit */}
      {activeTab === 'exit' && (
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#17324A]">Separation & Exit Status</h2>
          {exitRequest ? (
            <div className="p-4 rounded-xl border border-[#D9E5EE] bg-[#F8FAFC] space-y-2 text-xs">
              <p><strong>Resignation Date:</strong> {exitRequest.resignationDate}</p>
              <p><strong>Requested Relieving:</strong> {exitRequest.requestedRelievingDate}</p>
              <p><strong>Reason Category:</strong> {exitRequest.reasonCategory}</p>
              <p><strong>Status:</strong> {exitRequest.status}</p>
            </div>
          ) : (
            <p className="text-xs text-emerald-600 font-semibold">Active Employee in Good Standing · No Exit Filed.</p>
          )}
        </div>
      )}
    </div>
  );
}
