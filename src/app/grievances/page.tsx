'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  FileWarning,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  HelpDeskTicketPriority,
  useHRMS,
} from '@/context/HRMSContext';

const statusStyles = {
  Open: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function GrievancesPage() {
  const { currentUser, helpDeskTickets, submitHelpDeskTicket } = useHRMS();
  const [priority, setPriority] = useState<HelpDeskTicketPriority>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submittedTicketId, setSubmittedTicketId] = useState('');

  const grievances = useMemo(
    () =>
      helpDeskTickets.filter(
        (ticket) =>
          ticket.employeeId === currentUser.id &&
          ticket.category === 'Grievance / Complaint'
      ),
    [currentUser.id, helpDeskTickets]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const ticketId = submitHelpDeskTicket({
      category: 'Grievance / Complaint',
      priority,
      subject: subject.trim(),
      description: description.trim(),
    });

    setSubmittedTicketId(ticketId);
    setPriority('Medium');
    setSubject('');
    setDescription('');
  };

  if (currentUser.userRole !== 'employee') {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-600" />
        <h1 className="mt-3 text-xl font-black text-[#17324A]">Employee Grievance Box</h1>
        <p className="mt-2 text-sm text-rose-700">This confidential submission workspace is available only to employees.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-700">
          <ShieldAlert className="h-4 w-4" /> Confidential employee channel
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Grievance / Complaint Box</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#667085]">
          Submit a workplace grievance directly to HR. This is separate from Ask HR support tickets and includes its own complaint history.
        </p>
      </header>

      {submittedTicketId && (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Grievance submitted directly to HR. Reference: <span className="font-mono">{submittedTicketId}</span>
          </span>
          <button type="button" onClick={() => setSubmittedTicketId('')} className="w-fit font-bold text-emerald-700 hover:text-emerald-900">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
          <div className="border-b border-[#E4EBF1] pb-4">
            <h2 className="flex items-center gap-2 text-base font-black text-[#17324A]"><FileWarning className="h-4 w-4 text-amber-700" /> Raise a complaint</h2>
            <p className="mt-1 text-xs text-[#667085]">Provide enough detail for HR to review and respond appropriately.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#D9E5EE] bg-[#F7FAFC] px-4 py-3 text-xs">
              <p className="font-semibold text-[#17324A]">{currentUser.name}</p>
              <p className="mt-0.5 text-[11px] text-[#667085]">{currentUser.employeeCode} · {currentUser.department}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
                Submission type
                <input value="Grievance / Complaint" disabled className="w-full cursor-not-allowed rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800" />
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as HelpDeskTicketPriority)} className="w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
              Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly describe your grievance or complaint" maxLength={100} required className="w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40" />
            </label>

            <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
              Complaint details
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the concern, relevant events, people involved, and the support expected from HR..." rows={7} minLength={10} maxLength={1500} required className="w-full resize-none rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40" />
              <span className="block text-right text-[10px] font-normal text-[#98A2B3]">{description.length}/1500</span>
            </label>

            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-5 py-3 text-xs font-bold text-white transition-colors hover:bg-amber-800 sm:w-auto">
              <Send className="h-3.5 w-3.5" /> Submit complaint to HR
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-[#E4EBF1] pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-[#17324A]"><Clock3 className="h-4 w-4 text-[#5B91B5]" /> My grievance history</h2>
              <p className="mt-1 text-xs text-[#667085]">Track only complaints and the responses shared by HR.</p>
            </div>
            <span className="rounded-full bg-[#E8F2FA] px-3 py-1 text-[10px] font-bold text-[#315B76]">{grievances.length} total</span>
          </div>

          {grievances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#B0D0EA] bg-[#F9FBFD] px-5 py-12 text-center mt-4">
              <FileWarning className="mx-auto h-8 w-8 text-[#9FC2DC]" />
              <p className="mt-2 text-sm font-bold text-[#17324A]">No grievances submitted</p>
              <p className="mt-1 text-xs text-[#667085]">Your complaint history and HR responses will appear here.</p>
            </div>
          ) : (
            <div className="mt-4 max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {grievances.map((ticket) => (
                <article key={ticket.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#315B76]">{ticket.id}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyles[ticket.status]}`}>{ticket.status}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">{ticket.priority} priority</span>
                  </div>
                  <h3 className="mt-2 text-sm font-black text-[#17324A]">{ticket.subject}</h3>
                  <p className="mt-1 text-[10px] text-[#98A2B3]">Submitted {ticket.createdAt}</p>
                  <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#52677A]">{ticket.description}</p>
                  {ticket.resolution && (
                    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">HR response</p>
                      <p className="mt-1 text-[11px] text-emerald-800">{ticket.resolution}</p>
                      {ticket.resolvedAt && <p className="mt-1 text-[10px] text-emerald-700">Resolved {ticket.resolvedAt}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
