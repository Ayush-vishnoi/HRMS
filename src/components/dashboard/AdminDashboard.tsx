
'use client';

import React, { useState } from 'react';
import {
  Users,
  TrendingUp,
  Building,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  Headset,
  Clock3,
  Check,
  X,
} from 'lucide-react';

import { MOCK_ANALYTICS } from '@/data/mockData';
import { useHRMS } from '@/context/HRMSContext';

export const AdminDashboard: React.FC = () => {
  const {
    helpDeskTickets,
    updateHelpDeskTicket,
    lateClockInRequests,
    reviewLateClockInRequest,
  } = useHRMS();
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const askHrTickets = helpDeskTickets.filter((ticket) => ticket.category !== 'Grievance / Complaint');
  const complaintTickets = helpDeskTickets.filter((ticket) => ticket.category === 'Grievance / Complaint');
  const openTicketCount = helpDeskTickets.filter((ticket) => ticket.status !== 'Resolved').length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]/70">
          HR Administration
        </p>

        <h1 className="text-xl font-bold text-[#17324A] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#17324A]" />
          HR Admin Dashboard
        </h1>

        <p className="text-xs text-[#17324A]/70 mt-1">
          Monitor workforce, payroll, recruitment, and HR operations.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Total Headcount */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Total Headcount</span>
            <Users className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            105
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            +8 new hires this month
          </span>
        </div>

        {/* Job Openings */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Active Job Openings</span>
            <UserPlus className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            14
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            Engineering & Product
          </span>
        </div>

        {/* Attrition */}
        <div className="p-4 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm hover:border-[#17324A]/40 transition-colors">
          <div className="flex justify-between items-center text-[#17324A]/70 text-xs font-semibold">
            <span>Attrition Rate</span>
            <TrendingUp className="w-4 h-4 text-[#17324A]" />
          </div>

          <div className="text-2xl font-black text-[#17324A] mt-2">
            2.4%
          </div>

          <span className="text-[11px] text-[#17324A]/70 font-medium">
            Below industry avg (5%)
          </span>
        </div>
      </div>

      {/* Admin Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Department Headcount */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm space-y-4">

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#17324A]" />
              Company Headcount by Department
            </h3>

            <span className="text-xs text-[#17324A]/70 font-semibold cursor-pointer hover:text-[#17324A]">
              Full Report
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_ANALYTICS.headcountByDept.map((dept) => (
              <div key={dept.name} className="space-y-1">

                <div className="flex justify-between text-xs font-semibold text-[#17324A]/70">
                  <span>{dept.name}</span>
                  <span>{dept.count} Employees</span>
                </div>

                <div className="w-full bg-[#B0D0EA]/40 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all bg-[#17324A]"
                    style={{
                      width: `${(dept.count / 42) * 100}%`,
                    }}
                  />
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* HR Compliance */}
        <div className="p-6 rounded-2xl bg-white border border-[#B0D0EA] shadow-sm space-y-4">

          <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#17324A]" />
            Compliance & Action Items
          </h3>

          <div className="space-y-3">

            {/* KYC */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Employee KYC Verifications
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  3 Pending
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                3 new hires require Aadhaar and PAN verification completion.
              </p>
            </div>

            {/* Payroll */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  August Payroll Pre-Run
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  Ready
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                Monthly tax withholding & PF calculations updated.
              </p>
            </div>

            {/* Appraisal */}
            <div className="p-3 rounded-xl bg-[#B0D0EA]/25 border border-[#B0D0EA] space-y-1">

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Q3 Appraisal Cycle
                </span>

                <span className="text-[9px] px-2 py-0.5 rounded bg-[#B0D0EA]/60 text-[#17324A] border border-[#B0D0EA] font-bold">
                  Scheduled
                </span>
              </div>

              <p className="text-[11px] text-[#17324A]/70">
                360-degree feedback reviews launch Sept 1st.
              </p>
            </div>

          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#D9E5EE] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <Clock3 className="h-4 w-4" />
              Late Clock-in Approvals
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">
              Review Employee and Manager clock-in requests submitted after 10:00 AM.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
            {lateClockInRequests.filter((request) => request.status === 'pending').length} Pending
          </span>
        </div>

        {lateClockInRequests.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-xs font-semibold text-[#17324A]">No late clock-in requests</p>
            <p className="mt-1 text-[11px] text-[#667085]">New requests will appear here during portal hours.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {lateClockInRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#17324A]">{request.requesterName}</span>
                      <span className="font-mono text-[10px] font-bold text-[#315B76]">{request.requesterCode}</span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-bold capitalize text-sky-700">{request.requesterRole}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : request.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {request.status}
                      </span>
                    </div>
                    <dl className="mt-2 grid grid-cols-1 gap-1 text-[10px] text-[#667085] sm:grid-cols-3">
                      <div><dt className="font-bold text-[#52677A]">Request date</dt><dd>{request.requestDate}</dd></div>
                      <div><dt className="font-bold text-[#52677A]">Requested at</dt><dd>{request.requestedAt}</dd></div>
                      <div><dt className="font-bold text-[#52677A]">Request ID</dt><dd className="font-mono">{request.id}</dd></div>
                    </dl>
                    <p className="mt-3 rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs leading-5 text-[#52677A]">{request.reason}</p>
                    {request.reviewedAt && <p className="mt-2 text-[10px] text-[#98A2B3]">Reviewed {request.reviewedAt}</p>}
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
                      <button type="button" onClick={() => reviewLateClockInRequest(request.id, 'approved')} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button type="button" onClick={() => reviewLateClockInRequest(request.id, 'rejected')} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50">
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-[#D9E5EE] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <Headset className="h-4 w-4" />
              Employee HR Requests
            </h2>
            <p className="mt-1 text-[11px] text-[#667085]">Ask HR support tickets and complaints use separate queues with synchronized status updates.</p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">
            {openTicketCount} Active
          </span>
        </div>

        {helpDeskTickets.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-xs font-semibold text-[#17324A]">No help desk tickets</p>
            <p className="mt-1 text-[11px] text-[#667085]">New employee requests will appear here.</p>
          </div>
        ) : (
          <div className="mt-4 grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
            {[
              { title: 'Ask HR ticket queue', tickets: askHrTickets, complaint: false },
              { title: 'Grievance / Complaint queue', tickets: complaintTickets, complaint: true },
            ].map((group) => (
              <div key={group.title} className={`min-w-0 rounded-xl border p-3 ${group.complaint ? 'border-rose-200 bg-rose-50/40' : 'border-sky-200 bg-sky-50/40'}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black text-[#17324A]">{group.title}</h3>
                  <span className={`rounded-full border bg-white px-2 py-0.5 text-[9px] font-bold ${group.complaint ? 'border-rose-200 text-rose-700' : 'border-sky-200 text-sky-700'}`}>{group.tickets.length} total</span>
                </div>
                {group.tickets.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#B0D0EA] bg-white px-3 py-8 text-center text-[11px] text-[#667085]">No {group.complaint ? 'complaints' : 'Ask HR tickets'} received.</div>
                ) : (
                  <div className="space-y-3">
                    {group.tickets.map((ticket) => (
              <article key={ticket.id} className="min-w-0 overflow-hidden rounded-xl border border-[#D9E5EE] bg-white p-4">
                <div className="flex min-w-0 flex-col gap-4">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#315B76]">{ticket.id}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${ticket.category === 'Grievance / Complaint' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                        {ticket.category === 'Grievance / Complaint' ? 'Grievance / Complaint' : 'Ask HR'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{ticket.status}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${ticket.priority === 'High' ? 'bg-red-100 text-red-700' : ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-600'}`}>{ticket.priority}</span>
                    </div>
                    <h3 className="mt-3 [overflow-wrap:anywhere] text-xs font-bold leading-5 text-[#17324A]">{ticket.subject}</h3>
                    <p className="mt-1 [overflow-wrap:anywhere] text-[11px] leading-4 text-[#667085]">{ticket.employeeName} · {ticket.employeeCode} · {ticket.category}</p>
                    <div className="mt-3 rounded-lg border border-[#E4EBF1] bg-[#F9FBFD] px-3 py-2.5">
                      <p className="whitespace-pre-wrap [overflow-wrap:anywhere] text-xs leading-5 text-[#52677A]">{ticket.description}</p>
                    </div>
                    <p className="mt-2 [overflow-wrap:anywhere] text-[10px] text-[#98A2B3]">Raised {ticket.createdAt}</p>
                  </div>

                  {ticket.status !== 'Resolved' && (
                    <div className="w-full min-w-0 space-y-2 border-t border-[#E4EBF1] pt-3">
                      <textarea
                        value={resolutionNotes[ticket.id] ?? ''}
                        onChange={(event) => setResolutionNotes((current) => ({ ...current, [ticket.id]: event.target.value }))}
                        placeholder="Add an update or resolution note..."
                        rows={3}
                        className="w-full resize-none rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-[11px] text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9]"
                      />
                      <div className="flex flex-wrap justify-end gap-2">
                        {ticket.status === 'Open' && (
                          <button type="button" onClick={() => updateHelpDeskTicket(ticket.id, 'In Progress', resolutionNotes[ticket.id])} className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-1.5 text-[10px] font-bold text-[#315B76] hover:bg-[#E8F2FA]">Mark in progress</button>
                        )}
                        <button type="button" disabled={!resolutionNotes[ticket.id]?.trim()} onClick={() => updateHelpDeskTicket(ticket.id, 'Resolved', resolutionNotes[ticket.id])} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Resolve ticket</button>
                      </div>
                    </div>
                  )}
                </div>
                {ticket.resolution && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">HR update</p>
                    <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] text-[11px] leading-5 text-emerald-800">{ticket.resolution}</p>
                  </div>
                )}
              </article>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};


