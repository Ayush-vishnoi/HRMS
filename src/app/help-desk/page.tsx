'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Headset,
  Inbox,
  MessageSquareText,
  Search,
} from 'lucide-react';
import {
  HelpDeskTicketStatus,
  useHRMS,
} from '@/context/HRMSContext';

const statusStyles: Record<HelpDeskTicketStatus, string> = {
  Open: 'border-amber-200 bg-amber-50 text-amber-700',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  Resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const priorityStyles = {
  Low: 'bg-slate-100 text-slate-700',
  Medium: 'bg-amber-100 text-amber-700',
  High: 'bg-rose-100 text-rose-700',
};

export default function HelpDeskPage() {
  const { currentUser, helpDeskTickets, updateHelpDeskTicket } = useHRMS();
  const [statusFilter, setStatusFilter] = useState<'All' | HelpDeskTicketStatus>('All');
  const [search, setSearch] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const isAdmin = currentUser.userRole === 'admin';
  const visibleTickets = useMemo(() => helpDeskTickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${ticket.id} ${ticket.subject} ${ticket.employeeName} ${ticket.employeeCode} ${ticket.category}`.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  }), [helpDeskTickets, search, statusFilter]);

  const activeCount = helpDeskTickets.filter((ticket) => ticket.status !== 'Resolved').length;
  const resolvedCount = helpDeskTickets.filter((ticket) => ticket.status === 'Resolved').length;

  const updateTicket = (ticketId: string, status: HelpDeskTicketStatus) => {
    const note = resolutionNotes[ticketId]?.trim();
    if (status === 'Resolved' && !note) return;
    updateHelpDeskTicket(ticketId, status, note);
    setNotice(status === 'Resolved' ? 'Ticket resolved and update shared with the employee.' : 'Ticket moved to In Progress.');
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <Headset className="mx-auto h-10 w-10 text-rose-600" />
        <h1 className="mt-3 text-xl font-black text-[#17324A]">HR Help Desk</h1>
        <p className="mt-2 text-sm text-rose-700">This workspace is available only to HR Admin users.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Headset className="h-4 w-4" /> Employee support operations
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">HR Help Desk</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#667085]">Review employee-raised Ask HR tickets, share progress updates, and close issues with a resolution note.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#315B76] shadow-sm">
          <Inbox className="h-4 w-4" /> {activeCount} active ticket{activeCount === 1 ? '' : 's'}
        </div>
      </header>

      {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total tickets" value={String(helpDeskTickets.length)} detail="All employee requests" icon={Inbox} />
        <StatCard label="Needs attention" value={String(activeCount)} detail="Open or in progress" icon={Clock3} />
        <StatCard label="Resolved" value={String(resolvedCount)} detail="Updates sent to employees" icon={CheckCircle2} />
      </div>

      <section className="rounded-2xl border border-[#B0D0EA] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-[#17324A]"><MessageSquareText className="h-4 w-4 text-[#5B91B5]" /> Ticket queue</h2>
            <p className="mt-1 text-xs text-[#667085]">Resolution notes are visible to the employee in their Ask HR panel.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#98A2B3]" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets" className="w-full rounded-lg border border-[#D9E5EE] py-2 pl-8 pr-3 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9] sm:w-52" />
            </label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All' | HelpDeskTicketStatus)} className="rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs font-semibold text-[#315B76] outline-none focus:border-[#6FA6C9]">
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {visibleTickets.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-[#B0D0EA] bg-[#F9FBFD] px-5 py-12 text-center">
            <Inbox className="mx-auto h-8 w-8 text-[#9FC2DC]" />
            <p className="mt-2 text-sm font-bold text-[#17324A]">No tickets found</p>
            <p className="mt-1 text-xs text-[#667085]">New employee requests will appear here automatically.</p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {visibleTickets.map((ticket) => (
              <article key={ticket.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#5B91B5]">{ticket.id}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyles[ticket.status]}`}>{ticket.status}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${priorityStyles[ticket.priority]}`}>{ticket.priority} priority</span>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-[#17324A]">{ticket.subject}</h3>
                    <p className="mt-1 text-[11px] text-[#667085]">{ticket.employeeName} · {ticket.employeeCode} · {ticket.category} · Raised {ticket.createdAt}</p>
                    <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-[#315B76]">{ticket.description}</p>
                    {ticket.resolution && <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">HR update</p><p className="mt-1 text-[11px] text-emerald-800">{ticket.resolution}</p>{ticket.resolvedAt && <p className="mt-1 text-[10px] text-emerald-700">Resolved {ticket.resolvedAt}</p>}</div>}
                  </div>
                  {ticket.status !== 'Resolved' && <div className="w-full shrink-0 space-y-2 xl:w-80">
                    <label className="block text-[10px] font-bold uppercase tracking-wide text-[#315B76]" htmlFor={`resolution-${ticket.id}`}>HR update / resolution note</label>
                    <textarea id={`resolution-${ticket.id}`} value={resolutionNotes[ticket.id] ?? ticket.resolution ?? ''} onChange={(event) => setResolutionNotes((current) => ({ ...current, [ticket.id]: event.target.value }))} rows={3} placeholder="Write an update for the employee..." className="w-full resize-none rounded-lg border border-[#D9E5EE] bg-white px-3 py-2 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9]" />
                    <div className="flex flex-wrap justify-end gap-2">
                      {ticket.status === 'Open' && <button type="button" onClick={() => updateTicket(ticket.id, 'In Progress')} className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-[10px] font-bold text-[#315B76] hover:bg-[#E8F2FA]">Mark in progress</button>}
                      <button type="button" disabled={!resolutionNotes[ticket.id]?.trim()} onClick={() => updateTicket(ticket.id, 'Resolved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Resolve ticket</button>
                    </div>
                  </div>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">{label}</p><Icon className="h-4 w-4 text-[#5B91B5]" /></div><p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p><p className="mt-1 text-[10px] text-[#98A2B3]">{detail}</p></div>;
}
