'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Target,
  UsersRound,
} from 'lucide-react';

import { EmployeeDetailsModal } from '@/features/employees/components/EmployeeDetailsModal';
import type { Employee } from '@/features/employees/data/employees';
import type { TeamMemberMetadata } from '@/features/teams/data/teams';
import { useHRMS } from '@/shared/providers/HRMSContext';

const statusFilters = ['All', 'Active', 'Remote', 'On Leave'] as const;
type StatusFilter = (typeof statusFilters)[number];

type TeamPerson = {
  employee: Employee;
  metadata: TeamMemberMetadata;
};

type FormattedTeam = {
  id: string;
  name: string;
  department: string;
  manager: string;
  leaderId: string;
  focus: string;
  leader: TeamPerson;
  members: TeamPerson[];
};

const getRiskClasses = (risk: TeamMemberMetadata['risk']) => {
  if (risk === 'At risk') return 'border-red-200 bg-red-50 text-red-600';
  if (risk === 'Needs attention') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const getStatusClasses = (status: Employee['status']) => {
  if (status === 'On Leave') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (status === 'Remote') return 'border-[#B0D0EA] bg-[#EAF2F8] text-[#17324A]';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

export default function MyTeamPage() {
  const { currentUser } = useHRMS();
  const [teams, setTeams] = useState<FormattedTeam[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/my-team?managerId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTeams(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load teams from database:', err);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [currentUser.id]);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return teams.filter((team) => {
      const people = [team.leader, ...team.members];
      const searchableText = [
        team.name,
        team.department,
        team.focus,
        ...people.flatMap(({ employee }) => [employee.name, employee.role]),
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === 'All' ||
        people.some(({ employee }) => employee.status === statusFilter);

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, teams]);

  const totalPeople = teams.reduce((total, team) => total + team.members.length + 1, 0);
  const averageGoalProgress = teams.length
    ? Math.round(
        teams.reduce((total, team) => total + team.leader.metadata.goalProgress, 0) /
          teams.length
      )
    : 0;
  const attentionCount = teams.filter(
    (team) => team.leader.metadata.risk !== 'On track'
  ).length;

  const showAction = (message: string) => {
    setActiveAction(message);
    window.setTimeout(() => setActiveAction(null), 2600);
  };

  const saveNote = async (leader: Employee) => {
    const noteText = notes[leader.id] ?? '';
    showAction(`Leadership note saved to database for ${leader.name}`);

    try {
      await fetch('/api/my-team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: leader.id,
          managerId: currentUser.id,
          notes: noteText,
        }),
      });
    } catch (err) {
      console.error('Failed to save team note to database:', err);
    }
  };

  if (currentUser.userRole !== 'manager') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-[#B0D0EA] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B0D0EA]/50">
            <UsersRound className="h-6 w-6 text-[#17324A]" />
          </div>
          <h2 className="text-lg font-bold text-[#17324A]">Manager access required</h2>
          <p className="mt-2 text-sm text-[#55708A]">
            This workspace is available only to people managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]">
            Manager workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17324A]">
            Teams & Team Leaders
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#55708A]">
            Manage multiple teams through their leaders backed by PostgreSQL. Contact a Team Leader directly,
            then expand the team only when member-level context is needed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => showAction('Team Leader planning session created')}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#9FC4E1] bg-[#B0D0EA] px-4 py-2.5 text-xs font-bold text-[#17324A] shadow-sm transition hover:bg-[#9FC4E1]"
        >
          <CalendarDays className="h-4 w-4" />
          Plan leaders session
        </button>
      </header>

      {activeAction && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
        >
          <Check className="h-4 w-4" />
          {activeAction}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Managed teams" value={String(teams.length)} detail="Led through Team Leaders" icon={UsersRound} />
        <StatCard label="Team Leaders" value={String(teams.length)} detail="Your direct contact points" icon={MessageSquare} />
        <StatCard label="People covered" value={String(totalPeople)} detail="Leaders and team members" icon={Target} />
        <StatCard
          label="Leader follow-ups"
          value={String(attentionCount)}
          detail={`${averageGoalProgress}% average team goal progress`}
          icon={AlertTriangle}
          warning={attentionCount > 0}
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-[#B0D0EA] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#B0D0EA] bg-[#B0D0EA]/20 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#17324A]">Team Leader directory</h2>
            <p className="mt-1 text-xs text-[#55708A]">
              {filteredTeams.length} of {teams.length} managed teams shown from PostgreSQL
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55708A]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team or person"
                className="w-full rounded-lg border border-[#B0D0EA] bg-white py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none placeholder:text-[#7890A5] focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60 sm:w-56"
              />
            </label>
            <label className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full appearance-none rounded-lg border border-[#B0D0EA] bg-white py-2 pl-3 pr-9 text-xs font-medium text-[#17324A] outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60"
              >
                <option value="All">All availability</option>
                {statusFilters.slice(1).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55708A]" />
            </label>
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div className="p-12 text-center">
            <UsersRound className="mx-auto h-8 w-8 text-[#9AB6CC]" />
            <p className="mt-3 text-sm font-semibold text-[#17324A]">No teams found</p>
            <p className="mt-1 text-xs text-[#55708A]">No Team Leader or member matches the filters in database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-2">
            {filteredTeams.map((team) => {
              const { employee: leader, metadata } = team.leader;
              return (
                <article key={team.id} className="rounded-xl border border-[#B0D0EA] bg-white p-5 transition hover:border-[#8FB8D8] hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <img src={leader.avatar} alt={leader.name} className="h-14 w-14 rounded-full border-2 border-[#B0D0EA] object-cover" />
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-[#9FC4E1] bg-[#EAF2F8] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#17324A]">
                          Team Leader
                        </span>
                        <h3 className="mt-1 truncate text-sm font-bold text-[#17324A]">{leader.name}</h3>
                        <p className="truncate text-xs text-[#55708A]">{leader.role}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(leader.status)}`}>
                      {leader.status}
                    </span>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#D9E5EE] bg-[#F7FAFC] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#17324A]">{team.name}</p>
                        <p className="text-[11px] font-medium text-[#55708A]">{team.department} · {team.members.length} members</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getRiskClasses(metadata.risk)}`}>
                        {metadata.risk}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[#55708A]">{team.focus}</p>
                    <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-[#55708A]">
                      <span>Team goal progress</span>
                      <span className="text-[#17324A]">{metadata.goalProgress}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[#DCEAF5]">
                      <div className="h-full rounded-full bg-[#17324A]" style={{ width: `${metadata.goalProgress}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2" aria-label={`Contact ${leader.name}`}>
                    <a href={`mailto:${leader.email}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B0D0EA] bg-white px-2 py-2 text-[11px] font-bold text-[#17324A] transition hover:bg-[#EAF2F8]">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                    <a href={`tel:${leader.phone.replace(/\s/g, '')}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#B0D0EA] bg-white px-2 py-2 text-[11px] font-bold text-[#17324A] transition hover:bg-[#EAF2F8]">
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                    <button type="button" onClick={() => showAction(`Message thread opened with ${leader.name}`)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#9FC4E1] bg-[#B0D0EA]/50 px-2 py-2 text-[11px] font-bold text-[#17324A] transition hover:bg-[#B0D0EA]">
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-[#D9E5EE] pt-3 text-[11px] text-[#55708A]">
                    <span>Next leader 1:1: <strong className="text-[#17324A]">{metadata.nextOneToOne}</strong></span>
                    <button type="button" onClick={() => setSelectedEmployee(leader)} className="inline-flex items-center gap-1 font-bold text-[#17324A] hover:text-[#55708A]">
                      <FileText className="h-3.5 w-3.5" /> Profile
                    </button>
                  </div>

                  <details className="mt-4 rounded-lg border border-[#D9E5EE] bg-[#F9FBFD]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-xs font-bold text-[#17324A]">
                      <span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4" /> View {team.members.length} team members</span>
                      <ChevronDown className="h-4 w-4" />
                    </summary>
                    <div className="space-y-2 border-t border-[#D9E5EE] p-3">
                      {team.members.map(({ employee, metadata: memberMetadata }) => (
                        <div key={employee.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#D9E5EE] bg-white p-3">
                          <button type="button" onClick={() => setSelectedEmployee(employee)} className="flex min-w-0 items-center gap-3 text-left">
                            <img src={employee.avatar} alt="" className="h-9 w-9 rounded-full border border-[#B0D0EA] object-cover" />
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-[#17324A]">{employee.name}</span>
                              <span className="block truncate text-[10px] text-[#55708A]">{employee.role}</span>
                            </span>
                          </button>
                          <div className="shrink-0 text-right">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getStatusClasses(employee.status)}`}>{employee.status}</span>
                            <p className="mt-1 text-[9px] font-medium text-[#55708A]">Goal {memberMetadata.goalProgress}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  <details className="mt-3 border-t border-[#D9E5EE] pt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-bold text-[#55708A] hover:text-[#17324A]">
                      <MessageSquare className="h-3.5 w-3.5" /> Leadership note
                    </summary>
                    <textarea
                      value={notes[leader.id] ?? metadata.notes}
                      onChange={(event) => setNotes((current) => ({ ...current, [leader.id]: event.target.value }))}
                      className="mt-3 min-h-20 w-full rounded-lg border border-[#B0D0EA] bg-white p-3 text-xs text-[#17324A] outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60"
                      placeholder="Write a note for this Team Leader..."
                    />
                    <button type="button" onClick={() => saveNote(leader)} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#9FC4E1] bg-[#B0D0EA] px-3 py-1.5 text-[11px] font-bold text-[#17324A] hover:bg-[#9FC4E1]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Save note
                    </button>
                  </details>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          canViewCompensation={false}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[#B0D0EA] bg-white p-5 shadow-sm transition hover:border-[#9FC4E1] hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#55708A]">{label}</span>
        <div className={`rounded-lg p-2 ${warning ? 'bg-amber-50' : 'bg-[#B0D0EA]/50'}`}>
          <Icon className={`h-4 w-4 ${warning ? 'text-amber-600' : 'text-[#17324A]'}`} />
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-[#17324A]">{value}</p>
      <p className="mt-1 text-[11px] text-[#55708A]">{detail}</p>
    </div>
  );
}
