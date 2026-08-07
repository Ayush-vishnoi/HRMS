'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { Employee, MOCK_TEAM_METADATA, TeamMemberMetadata } from '@/data/mockData';
import { EmployeeDetailsModal } from '@/components/modals/EmployeeDetailsModal';

const statusFilters = ['All', 'Active', 'Remote', 'On Leave'] as const;
type StatusFilter = (typeof statusFilters)[number];

const fallbackMetadata = (employee: Employee, manager: string): TeamMemberMetadata => ({
  employeeId: employee.id,
  manager,
  focus: `${employee.department} delivery and quarterly priorities`,
  workload: 70,
  goalProgress: 60,
  goalLabel: 'Progress against quarterly priorities',
  nextOneToOne: 'To be scheduled',
  risk: 'On track',
  notes: 'Add a coaching note after the next one-to-one.',
});

const getRiskClasses = (risk: TeamMemberMetadata['risk']) => {
  if (risk === 'At risk') return 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/25';
  if (risk === 'Needs attention') return 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/25';
  return 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/25';
};

const getStatusClasses = (status: Employee['status']) => {
  if (status === 'On Leave') return 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/25';
  if (status === 'Remote') return 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/25';
  return 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/25';
};

export default function MyTeamPage() {
  const { currentUser, employees } = useHRMS();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const directReports = useMemo(
    () => employees.filter((employee) => employee.manager === currentUser.name),
    [currentUser.name, employees]
  );

  const team = useMemo(
    () => directReports.map((employee) => ({
      employee,
      metadata: MOCK_TEAM_METADATA.find((item) => item.employeeId === employee.id && item.manager === currentUser.name)
        ?? fallbackMetadata(employee, currentUser.name),
    })),
    [currentUser.name, directReports]
  );

  const filteredTeam = useMemo(() => team.filter(({ employee }) => {
    const matchesQuery = `${employee.name} ${employee.role} ${employee.department}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === 'All' || employee.status === statusFilter);
  }), [query, statusFilter, team]);

  const averageWorkload = team.length ? Math.round(team.reduce((total, member) => total + member.metadata.workload, 0) / team.length) : 0;
  const averageGoalProgress = team.length ? Math.round(team.reduce((total, member) => total + member.metadata.goalProgress, 0) / team.length) : 0;
  const attentionCount = team.filter(({ metadata }) => metadata.risk !== 'On track').length;

  const showAction = (action: string) => {
    setActiveAction(action);
    window.setTimeout(() => setActiveAction(null), 2600);
  };

  const saveNote = (employeeId: string) => {
    showAction('Team note saved');
    setNotes((current) => ({ ...current, [employeeId]: notes[employeeId] ?? '' }));
  };

  if (currentUser.userRole !== 'manager') {
    return (
      <section className="max-w-3xl mx-auto mt-12 rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-[#B86B78]" />
        <h1 className="mt-3 text-lg font-bold text-[#F0F2F5]">Manager access required</h1>
        <p className="mt-1 text-sm text-[#8B949E]">This workspace is available only to people managers.</p>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B86B78]">Manager workspace</p>
          <h1 className="mt-1 text-2xl font-bold text-[#F0F2F5]">My Team</h1>
          <p className="mt-1 text-sm text-[#8B949E]">Manage delivery, capacity, and regular check-ins for your direct reports.</p>
        </div>
        <button type="button" onClick={() => showAction('Team planning session created')} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#8B3A4A] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#A04456]">
          <CalendarDays className="h-4 w-4" />
          Plan team session
        </button>
      </div>

      {activeAction && <div role="status" className="flex items-center gap-2 rounded-md border border-[#3fb950]/25 bg-[#3fb950]/10 px-3 py-2 text-xs font-medium text-[#3fb950]"><Check className="h-4 w-4" />{activeAction}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Direct reports', value: team.length, detail: 'Reporting to you', icon: UsersRound, tone: 'text-[#B86B78]' },
          { label: 'Average workload', value: `${averageWorkload}%`, detail: 'Team capacity used', icon: Clock3, tone: 'text-[#58a6ff]' },
          { label: 'Goal progress', value: `${averageGoalProgress}%`, detail: 'Average this quarter', icon: Target, tone: 'text-[#3fb950]' },
          { label: 'Needs attention', value: attentionCount, detail: 'Follow-ups to review', icon: AlertTriangle, tone: 'text-[#d29922]' },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="rounded-lg border border-[#30363d] bg-[#161b22] p-4">
            <div className="flex items-start justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">{label}</span><Icon className={`h-4 w-4 ${tone}`} /></div>
            <p className="mt-3 text-2xl font-bold text-[#F0F2F5]">{value}</p>
            <p className="mt-1 text-[11px] text-[#6e7681]">{detail}</p>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-[#30363d] bg-[#161b22]">
        <div className="flex flex-col gap-3 border-b border-[#30363d] p-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-sm font-bold text-[#F0F2F5]">Team roster</h2><p className="mt-1 text-xs text-[#8B949E]">{filteredTeam.length} of {team.length} team members shown</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e7681]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search team" className="w-full rounded-md border border-[#30363d] bg-[#0d1117] py-2 pl-9 pr-3 text-xs text-[#F0F2F5] outline-none placeholder:text-[#6e7681] focus:border-[#8B3A4A] sm:w-48" /></label>
            <label className="relative"><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="w-full appearance-none rounded-md border border-[#30363d] bg-[#0d1117] py-2 pl-3 pr-8 text-xs text-[#F0F2F5] outline-none focus:border-[#8B3A4A]"><option value="All">All availability</option>{statusFilters.slice(1).map((status) => <option key={status} value={status}>{status}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B949E]" /></label>
          </div>
        </div>

        {filteredTeam.length === 0 ? <div className="p-10 text-center text-sm text-[#8B949E]">No direct reports match the current filters.</div> : <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-2">{filteredTeam.map(({ employee, metadata }) => <article key={employee.id} className="rounded-md border border-[#30363d] bg-[#21262d]/45 p-4 transition-colors hover:border-[#8B3A4A]/60">
          <div className="flex items-start gap-3"><img src={employee.avatar} alt={employee.name} className="h-11 w-11 rounded-full border border-[#30363d] object-cover" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-[#F0F2F5]">{employee.name}</h3><p className="text-xs text-[#B86B78]">{employee.role}</p></div><button type="button" aria-label={`More actions for ${employee.name}`} title="More actions" onClick={() => showAction(`Actions opened for ${employee.name}`)} className="rounded-md p-1 text-[#8B949E] hover:bg-[#30363d] hover:text-[#F0F2F5]"><MoreHorizontal className="h-4 w-4" /></button></div><div className="mt-2 flex flex-wrap gap-1.5"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClasses(employee.status)}`}>{employee.status}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getRiskClasses(metadata.risk)}`}>{metadata.risk}</span></div></div></div>
          <p className="mt-4 text-xs leading-5 text-[#8B949E]">{metadata.focus}</p>
          <div className="mt-4 grid grid-cols-2 gap-4"><div><div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-[#6e7681]"><span>Workload</span><span className="text-[#F0F2F5]">{metadata.workload}%</span></div><div className="mt-1 h-1.5 rounded-full bg-[#30363d]"><div className={`h-full rounded-full ${metadata.workload > 85 ? 'bg-[#d29922]' : 'bg-[#8B3A4A]'}`} style={{ width: `${metadata.workload}%` }} /></div></div><div><div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-[#6e7681]"><span>Goal</span><span className="text-[#F0F2F5]">{metadata.goalProgress}%</span></div><div className="mt-1 h-1.5 rounded-full bg-[#30363d]"><div className="h-full rounded-full bg-[#3fb950]" style={{ width: `${metadata.goalProgress}%` }} /></div></div></div>
          <div className="mt-4 flex items-center justify-between border-t border-[#30363d] pt-3"><span className="text-[11px] text-[#8B949E]"><span className="text-[#6e7681]">Next 1:1</span> {metadata.nextOneToOne}</span><button type="button" onClick={() => showAction(`One-to-one requested with ${employee.name}`)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B86B78] hover:text-[#F0F2F5]">Schedule 1:1 <ArrowUpRight className="h-3 w-3" /></button></div>
          <div className="mt-3 flex gap-2"><button type="button" onClick={() => setSelectedEmployee(employee)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#30363d] px-2.5 py-2 text-[11px] font-semibold text-[#F0F2F5] hover:bg-[#30363d]"><FileText className="h-3.5 w-3.5" />View profile</button><button type="button" onClick={() => showAction(`Reminder sent to ${employee.name}`)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#8B3A4A]/50 bg-[#8B3A4A]/10 px-2.5 py-2 text-[11px] font-semibold text-[#B86B78] hover:bg-[#8B3A4A]/20"><Mail className="h-3.5 w-3.5" />Send reminder</button></div>
          <details className="mt-3 border-t border-[#30363d] pt-3"><summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold text-[#8B949E] hover:text-[#F0F2F5]"><MessageSquare className="h-3.5 w-3.5" />Manager note</summary><textarea value={notes[employee.id] ?? metadata.notes} onChange={(event) => setNotes((current) => ({ ...current, [employee.id]: event.target.value }))} className="mt-2 min-h-16 w-full rounded-md border border-[#30363d] bg-[#0d1117] p-2 text-xs text-[#F0F2F5] outline-none focus:border-[#8B3A4A]" /><button type="button" onClick={() => saveNote(employee.id)} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#30363d] px-2.5 py-1.5 text-[11px] font-semibold text-[#F0F2F5] hover:bg-[#484f58]"><CheckCircle2 className="h-3.5 w-3.5" />Save note</button></details>
        </article>)}</div>}
      </section>
      {selectedEmployee && <EmployeeDetailsModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />}
    </div>
  );
}
