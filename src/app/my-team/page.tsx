'use client';

import { authFetch } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  ListTodo,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Target,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from 'lucide-react';

import Link from 'next/link';

import { EmployeeDetailsModal } from '@/features/employees/components/EmployeeDetailsModal';
import { useDirectReports, useTeamTasks } from '@/features/tasks/hooks/useTasks';
import type { Employee } from '@/features/employees/data/employees';
import type { TeamMemberMetadata } from '@/features/teams/data/teams';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useChat } from '@/shared/providers/ChatContext';

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

const getLeaderConflictForDept = (
  empId: string,
  targetDept: string,
  teamsList: FormattedTeam[],
  excludeTeamId?: string
) => {
  if (!targetDept) return null;
  const normDept = targetDept.trim().toLowerCase();
  const conflictTeam = teamsList.find(
    (t) =>
      t.id !== excludeTeamId &&
      t.department.trim().toLowerCase() === normDept &&
      t.leader.employee.id === empId
  );

  if (conflictTeam) {
    return `Already Team Leader of ${conflictTeam.name} in ${conflictTeam.department}`;
  }
  return null;
};

const getMemberConflictForDept = (
  empId: string,
  targetDept: string,
  teamsList: FormattedTeam[],
  targetTeamId?: string
) => {
  if (!targetDept) return null;
  const normDept = targetDept.trim().toLowerCase();

  const sameTeam = teamsList.find((t) => t.id === targetTeamId);
  if (sameTeam && sameTeam.members.some((m) => m.employee.id === empId)) {
    return `Already in this team`;
  }

  const conflictTeam = teamsList.find(
    (t) =>
      t.id !== targetTeamId &&
      t.department.trim().toLowerCase() === normDept &&
      t.members.some((m) => m.employee.id === empId)
  );

  if (conflictTeam) {
    return `Already assigned to ${conflictTeam.name} in ${conflictTeam.department}`;
  }
  return null;
};

export default function MyTeamPage() {
  const { currentUser, employees: directoryEmployees } = useHRMS();
  const { openChatWith } = useChat();

  // Task assignment is restricted to direct reports at the API level; mirror
  // that scoping here so quick actions only appear for assignable members.
  const isManagerOrAdmin = currentUser.userRole === 'manager' || currentUser.userRole === 'admin';
  const directReportsQuery = useDirectReports(isManagerOrAdmin);
  const teamTasksQuery = useTeamTasks({}, isManagerOrAdmin);

  const assignableMemberIds = useMemo(
    () => new Set((directReportsQuery.data ?? []).map((report) => report.id)),
    [directReportsQuery.data],
  );

  const openTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of teamTasksQuery.data?.tasks ?? []) {
      if (task.status === 'Done') continue;
      counts[task.assignedTo.id] = (counts[task.assignedTo.id] ?? 0) + 1;
    }
    return counts;
  }, [teamTasksQuery.data]);

  const [teams, setTeams] = useState<FormattedTeam[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Conflict error modal state
  const [conflictErrorModal, setConflictErrorModal] = useState<{
    title: string;
    message: string;
    conflict?: any;
  } | null>(null);

  // Team Management Modals
  const [managingTeam, setManagingTeam] = useState<FormattedTeam | null>(null);
  const [changingLeaderTeam, setChangingLeaderTeam] = useState<FormattedTeam | null>(null);
  const [addingMembersTeam, setAddingMembersTeam] = useState<FormattedTeam | null>(null);
  const [removingMember, setRemovingMember] = useState<{ team: FormattedTeam; member: Employee } | null>(null);

  // Search & Selection states for Modals
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Team State
  const [deletingTeam, setDeletingTeam] = useState<FormattedTeam | null>(null);
  const [createTeamError, setCreateTeamError] = useState<string | null>(null);

  // 4. Create New Team State
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDept, setNewTeamDept] = useState('');
  const [newTeamLeaderId, setNewTeamLeaderId] = useState('');
  const [newTeamMemberIds, setNewTeamMemberIds] = useState<string[]>([]);
  const [newTeamFocus, setNewTeamFocus] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !newTeamName.trim() || !newTeamLeaderId) return;

    setIsSubmitting(true);
    setCreateTeamError(null);
    try {
      const res = await authFetch<Response>('/api/my-team', { raw: true,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          department: newTeamDept.trim() || currentUser.department || 'Engineering',
          leaderId: newTeamLeaderId,
          memberIds: newTeamMemberIds,
          focus: newTeamFocus.trim() || `${newTeamName.trim()} delivery and goals`,
          managerId: currentUser.id,
        }),
      });

      const json = await res.json();
      if ((res.status === 201 || res.ok) && json.success) {
        showAction('Team created successfully.');
        setIsCreateTeamOpen(false);
        setNewTeamName('');
        setNewTeamLeaderId('');
        setNewTeamMemberIds([]);
        setNewTeamFocus('');
        setModalSearchQuery('');
        setCreateTeamError(null);
        await fetchTeams();
      } else if (res.status === 409 || json.code?.includes('CONFLICT')) {
        setConflictErrorModal({
          title: 'Department Assignment Conflict',
          message: json.message || 'Selected employee has a department-scoped assignment conflict.',
          conflict: json.conflict,
        });
        await fetchTeams();
      } else {
        const errorMsg = json.error || json.message || 'Team creation failed. Please try again.';
        setCreateTeamError(errorMsg);
        showAction(errorMsg);
      }
    } catch (err) {
      console.error('Failed to create team:', err);
      setCreateTeamError('Team creation failed. Please try again.');
      showAction('Error creating new team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await authFetch<Response>(`/api/my-team?teamId=${encodeURIComponent(deletingTeam.id)}`, { raw: true,
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showAction('Team deleted successfully.');
        setDeletingTeam(null);
        await fetchTeams();
      } else {
        showAction(json.error || json.message || 'Unable to delete team. Please try again.');
      }
    } catch (err) {
      console.error('Failed to delete team:', err);
      showAction('Error deleting team. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await authFetch<Response>(`/api/my-team?managerId=${encodeURIComponent(currentUser.id)}`, { raw: true,
        headers: { 'x-user-id': currentUser.id },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setTeams(json.data);
          if (managingTeam) {
            const updated = json.data.find((t: FormattedTeam) => t.id === managingTeam.id);
            if (updated) setManagingTeam(updated);
          }
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
    window.setTimeout(() => setActiveAction(null), 2800);
  };

  // 1. Change Team Leader
  const handleAssignLeader = async (teamId: string, newLeaderId: string) => {
    setIsSubmitting(true);
    try {
      const res = await authFetch<Response>('/api/my-team', { raw: true,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          action: 'UPDATE_LEADER',
          teamId,
          leaderId: newLeaderId,
          managerId: currentUser.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const leaderEmp = directoryEmployees.find((e) => e.id === newLeaderId);
        showAction(`Team Leader updated to ${leaderEmp?.name || json.data?.leader?.employee?.name || 'new leader'} in PostgreSQL`);
        setChangingLeaderTeam(null);
        await fetchTeams();
      } else if (res.status === 409 || json.code?.includes('CONFLICT')) {
        setConflictErrorModal({
          title: 'Team Leader Conflict',
          message: json.message || 'Selected employee is already a Team Leader in this department.',
          conflict: json.conflict,
        });
        await fetchTeams();
      } else {
        showAction(json.error || json.message || 'Failed to assign team leader');
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to update team leader:', err);
      showAction('Error assigning team leader');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Add Team Members
  const handleAddMembers = async (teamId: string) => {
    if (selectedMemberIds.length === 0) return;
    setIsSubmitting(true);

    try {
      const res = await authFetch<Response>('/api/my-team', { raw: true,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          action: 'ADD_MEMBERS',
          teamId,
          employeeIds: selectedMemberIds,
          managerId: currentUser.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showAction(`Added ${json.addedCount || selectedMemberIds.length} member(s) to team in PostgreSQL`);
        setAddingMembersTeam(null);
        setSelectedMemberIds([]);
        setModalSearchQuery('');
        await fetchTeams();
      } else if (res.status === 409 || json.code?.includes('CONFLICT')) {
        setConflictErrorModal({
          title: 'Team Member Department Conflict',
          message: json.message || 'One or more selected members are already assigned within the same department.',
          conflict: json.conflict,
        });
        await fetchTeams();
      } else {
        showAction(json.error || json.message || 'Failed to add members');
        await fetchTeams();
      }
    } catch (err) {
      console.error('Failed to add team members:', err);
      showAction('Error adding team members');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Remove Team Member
  const handleRemoveMember = async () => {
    if (!removingMember) return;
    setIsSubmitting(true);

    const { team, member } = removingMember;

    try {
      const res = await authFetch<Response>('/api/my-team', { raw: true,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          action: 'REMOVE_MEMBER',
          teamId: team.id,
          employeeId: member.id,
          managerId: currentUser.id,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showAction(`Removed ${member.name} from ${team.name} in PostgreSQL (Employee record preserved)`);
        setRemovingMember(null);
        await fetchTeams();
      } else {
        showAction(json.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Failed to remove team member:', err);
      showAction('Error removing team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveNote = async (leader: Employee) => {
    const noteText = notes[leader.id] ?? '';
    showAction(`Leadership note saved to database for ${leader.name}`);

    try {
      await authFetch<Response>('/api/my-team', { raw: true,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          action: 'UPDATE_METADATA',
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
            Manage multiple teams, assign Team Leaders, and add/remove team members backed by PostgreSQL. Contact Team Leaders directly or expand teams for management.
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
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 shadow-sm"
        >
          <Check className="h-4 w-4 text-emerald-600" />
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => {
                setIsCreateTeamOpen(true);
                setNewTeamName('');
                setNewTeamDept(currentUser.department || 'Engineering');
                setNewTeamLeaderId('');
                setNewTeamMemberIds([]);
                setNewTeamFocus('');
                setModalSearchQuery('');
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#17324A] bg-[#17324A] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#17324A]/90 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Team
            </button>
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
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusClasses(leader.status)}`}>
                        {leader.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => setManagingTeam(team)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#B0D0EA] bg-[#EAF2F8] px-2.5 py-1 text-xs font-bold text-[#17324A] transition hover:bg-[#B0D0EA] cursor-pointer"
                        title="Manage Team Leader & Members"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-[#17324A]" />
                        Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTeam(team)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100 hover:text-red-700 cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
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
                    <button type="button" onClick={() => void openChatWith(leader.id)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#9FC4E1] bg-[#B0D0EA]/50 px-2 py-2 text-[11px] font-bold text-[#17324A] transition hover:bg-[#B0D0EA]">
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
                      {team.members.map(({ employee, metadata: memberMetadata }) => {
                        const openTaskCount = openTaskCounts[employee.id] ?? 0;
                        const canAssignTask = assignableMemberIds.has(employee.id);
                        return (
                          <div key={employee.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#D9E5EE] bg-white p-3">
                            <button type="button" onClick={() => setSelectedEmployee(employee)} className="flex min-w-0 items-center gap-3 text-left">
                              <img src={employee.avatar} alt="" className="h-9 w-9 rounded-full border border-[#B0D0EA] object-cover" />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-[#17324A]">{employee.name}</span>
                                <span className="block truncate text-[10px] text-[#55708A]">{employee.role}</span>
                              </span>
                            </button>
                            <div className="flex items-center gap-2">
                              <div className="shrink-0 text-right">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getStatusClasses(employee.status)}`}>{employee.status}</span>
                                <p className="mt-1 text-[9px] font-medium text-[#55708A]">Goal {memberMetadata.goalProgress}%</p>
                                {openTaskCount > 0 && (
                                  <Link
                                    href={`/tasks?tab=team&assignee=${employee.id}`}
                                    className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#9FC4E1] bg-[#EAF2F8] px-2 py-0.5 text-[9px] font-bold text-[#17324A] transition hover:bg-[#B0D0EA]"
                                    title={`View ${employee.name}'s tasks`}
                                  >
                                    <ListTodo className="h-3 w-3" />
                                    {openTaskCount} open task{openTaskCount === 1 ? '' : 's'}
                                  </Link>
                                )}
                              </div>
                              {canAssignTask && (
                                <Link
                                  href={`/tasks?tab=team&assignee=${employee.id}&assign=1`}
                                  className="rounded-lg p-1.5 text-[#17324A] transition hover:bg-[#EAF2F8]"
                                  title={`Assign task to ${employee.name}`}
                                >
                                  <ListTodo className="h-3.5 w-3.5" />
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => setRemovingMember({ team, member: employee })}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                                title="Remove from team"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setAddingMembersTeam(team);
                          setSelectedMemberIds([]);
                          setModalSearchQuery('');
                        }}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#B0D0EA] bg-white py-2 text-xs font-bold text-[#17324A] transition hover:bg-[#EAF2F8]"
                      >
                        <Plus className="h-4 w-4" /> Add Team Member
                      </button>
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

      {/* 1. Manage Team Modal */}
      {managingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">Manage Team: {managingTeam.name}</h3>
                <p className="text-xs text-[#55708A]">{managingTeam.department} · Managed by {managingTeam.manager}</p>
              </div>
              <button
                type="button"
                onClick={() => setManagingTeam(null)}
                className="rounded-full p-1 text-[#55708A] hover:bg-[#EAF2F8] hover:text-[#17324A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto p-6">
              {/* Team Leader Section */}
              <div className="rounded-xl border border-[#B0D0EA] bg-[#EAF2F8]/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#55708A]">Team Leader</span>
                  <button
                    type="button"
                    onClick={() => {
                      setChangingLeaderTeam(managingTeam);
                      setModalSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#9FC4E1] bg-white px-3 py-1.5 text-xs font-bold text-[#17324A] shadow-xs transition hover:bg-[#B0D0EA]"
                  >
                    <UserCheck className="h-3.5 w-3.5" /> Change Team Leader
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <img src={managingTeam.leader.employee.avatar} alt="" className="h-12 w-12 rounded-full border-2 border-[#B0D0EA] object-cover" />
                  <div>
                    <h4 className="text-sm font-bold text-[#17324A]">{managingTeam.leader.employee.name}</h4>
                    <p className="text-xs text-[#55708A]">{managingTeam.leader.employee.role} · {managingTeam.leader.employee.email}</p>
                  </div>
                </div>
              </div>

              {/* Team Members Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#55708A]">
                    Team Members ({managingTeam.members.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingMembersTeam(managingTeam);
                      setSelectedMemberIds([]);
                      setModalSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#9FC4E1] bg-[#B0D0EA] px-3 py-1.5 text-xs font-bold text-[#17324A] shadow-xs transition hover:bg-[#9FC4E1]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Team Member
                  </button>
                </div>

                {managingTeam.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#B0D0EA] p-8 text-center text-xs text-[#55708A]">
                    No team members added yet. Click "+ Add Team Member" to assign employees.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {managingTeam.members.map(({ employee }) => (
                      <div key={employee.id} className="flex items-center justify-between rounded-xl border border-[#D9E5EE] bg-white p-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <img src={employee.avatar} alt="" className="h-10 w-10 rounded-full border border-[#B0D0EA] object-cover" />
                          <div>
                            <p className="text-xs font-bold text-[#17324A]">{employee.name}</p>
                            <p className="text-[11px] text-[#55708A]">{employee.role} · {employee.department}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRemovingMember({ team: managingTeam, member: employee })}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <button
                type="button"
                onClick={() => setManagingTeam(null)}
                className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Change Team Leader Modal */}
      {changingLeaderTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">Assign Team Leader</h3>
                <p className="text-xs text-[#55708A]">Team: {changingLeaderTeam.name}</p>
              </div>
              <button type="button" onClick={() => setChangingLeaderTeam(null)} className="rounded-full p-1 text-[#55708A] hover:bg-[#EAF2F8]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55708A]" />
                <input
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Search employee directory..."
                  className="w-full rounded-lg border border-[#B0D0EA] bg-white py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:border-[#17324A]"
                />
              </label>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {directoryEmployees
                  .filter((emp) => {
                    const q = modalSearchQuery.toLowerCase();
                    return !q || emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q);
                  })
                  .map((emp) => {
                    const isCurrentLeader = emp.id === changingLeaderTeam.leaderId;
                    const leaderConflict = getLeaderConflictForDept(
                      emp.id,
                      changingLeaderTeam.department,
                      teams,
                      changingLeaderTeam.id
                    );
                    const isDisabled = isCurrentLeader || Boolean(leaderConflict) || isSubmitting;

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleAssignLeader(changingLeaderTeam.id, emp.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                          isCurrentLeader
                            ? 'border-emerald-200 bg-emerald-50/60 opacity-80 cursor-default'
                            : leaderConflict
                            ? 'border-amber-200 bg-amber-50/60 opacity-75 cursor-not-allowed'
                            : 'border-[#D9E5EE] bg-white hover:border-[#17324A] hover:bg-[#EAF2F8]/40 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={emp.avatar} alt="" className="h-9 w-9 rounded-full border border-[#B0D0EA] object-cover" />
                          <div>
                            <p className="text-xs font-bold text-[#17324A]">{emp.name}</p>
                            <p className="text-[10px] text-[#55708A]">{emp.role} · {emp.department}</p>
                          </div>
                        </div>
                        {isCurrentLeader ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                            Current Leader
                          </span>
                        ) : leaderConflict ? (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            {leaderConflict}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-[#17324A]">Select & Assign</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end border-t border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <button
                type="button"
                onClick={() => setChangingLeaderTeam(null)}
                className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Add Team Members Modal */}
      {addingMembersTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">Add Team Members</h3>
                <p className="text-xs text-[#55708A]">Team: {addingMembersTeam.name}</p>
              </div>
              <button type="button" onClick={() => setAddingMembersTeam(null)} className="rounded-full p-1 text-[#55708A] hover:bg-[#EAF2F8]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55708A]" />
                <input
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  placeholder="Search employee by name or role..."
                  className="w-full rounded-lg border border-[#B0D0EA] bg-white py-2 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:border-[#17324A]"
                />
              </label>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {directoryEmployees
                  .filter((emp) => {
                    const q = modalSearchQuery.toLowerCase();
                    return !q || emp.name.toLowerCase().includes(q) || emp.role.toLowerCase().includes(q);
                  })
                  .map((emp) => {
                    const isLeader = emp.id === addingMembersTeam.leaderId;
                    const memberConflict = getMemberConflictForDept(
                      emp.id,
                      addingMembersTeam.department,
                      teams,
                      addingMembersTeam.id
                    );
                    const isDisabled = isLeader || Boolean(memberConflict);
                    const isSelected = selectedMemberIds.includes(emp.id);

                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center justify-between rounded-xl border p-3 transition ${
                          isDisabled
                            ? 'border-[#D9E5EE] bg-[#F7FAFC] opacity-70 cursor-not-allowed'
                            : isSelected
                            ? 'border-[#17324A] bg-[#EAF2F8]/60 cursor-pointer'
                            : 'border-[#D9E5EE] bg-white hover:border-[#9FC4E1] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            disabled={isDisabled}
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMemberIds((prev) => [...prev, emp.id]);
                              } else {
                                setSelectedMemberIds((prev) => prev.filter((id) => id !== emp.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-[#B0D0EA] text-[#17324A] focus:ring-[#17324A]"
                          />
                          <img src={emp.avatar} alt="" className="h-9 w-9 rounded-full border border-[#B0D0EA] object-cover" />
                          <div>
                            <p className="text-xs font-bold text-[#17324A]">{emp.name}</p>
                            <p className="text-[10px] text-[#55708A]">{emp.role} · {emp.department}</p>
                          </div>
                        </div>
                        {isLeader && <span className="text-[10px] font-bold text-[#17324A]">Team Leader</span>}
                        {memberConflict && <span className="text-[10px] font-semibold text-amber-800">{memberConflict}</span>}
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <span className="text-xs font-semibold text-[#55708A]">
                {selectedMemberIds.length} employee(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddingMembersTeam(null)}
                  className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedMemberIds.length === 0 || isSubmitting}
                  onClick={() => handleAddMembers(addingMembersTeam.id)}
                  className="rounded-lg border border-[#9FC4E1] bg-[#B0D0EA] px-4 py-2 text-xs font-bold text-[#17324A] shadow-xs transition hover:bg-[#9FC4E1] disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Selected Members'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Remove Member Confirmation Modal */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17324A]">Confirm Removal</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#55708A]">
                Are you sure you want to remove <strong>{removingMember.member.name}</strong> from <strong>{removingMember.team.name}</strong>?
              </p>
              <p className="mt-1 text-[11px] text-[#7890A5]">
                This will remove their team assignment in PostgreSQL. Their Employee record will remain safe in the organization directory.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleRemoveMember}
                className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Removing...' : 'Confirm Removal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Team Modal */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-[#B0D0EA] space-y-5">
            <div className="flex items-center justify-between border-b border-[#D9E5EE] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">Create New Team</h3>
                <p className="text-xs text-[#55708A]">Assign a Team Leader and team members from PostgreSQL employee directory</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTeamOpen(false)}
                className="rounded-lg p-1 text-[#55708A] hover:bg-[#EAF2F8] hover:text-[#17324A] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              {createTeamError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                  <span>{createTeamError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#17324A]">
                  Team Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Product Engineering"
                  className="mt-1 w-full rounded-lg border border-[#B0D0EA] px-3 py-2 text-xs font-medium text-[#17324A] outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17324A]">Department / Organization</label>
                <input
                  type="text"
                  value={newTeamDept}
                  onChange={(e) => setNewTeamDept(e.target.value)}
                  placeholder="e.g. Engineering"
                  className="mt-1 w-full rounded-lg border border-[#B0D0EA] px-3 py-2 text-xs font-medium text-[#17324A] outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60"
                />
              </div>

              {/* Select Team Leader */}
              <div>
                <label className="block text-xs font-bold text-[#17324A]">
                  Team Leader <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#55708A]" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Search employee for Team Leader..."
                    className="w-full rounded-lg border border-[#B0D0EA] py-1.5 pl-9 pr-3 text-xs text-[#17324A] outline-none focus:border-[#17324A]"
                  />
                </div>

                <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-[#B0D0EA] bg-[#F7FAFC] p-2 space-y-1">
                  {directoryEmployees
                    .filter((e) => !modalSearchQuery || e.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || e.role.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                    .map((emp) => {
                      const isSelected = newTeamLeaderId === emp.id;
                      const targetDept = newTeamDept.trim() || currentUser.department || 'Engineering';
                      const leaderConflict = getLeaderConflictForDept(emp.id, targetDept, teams);

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          disabled={Boolean(leaderConflict)}
                          onClick={() => {
                            setNewTeamLeaderId(emp.id);
                            setNewTeamMemberIds((prev) => prev.filter((id) => id !== emp.id));
                          }}
                          className={`w-full flex items-center justify-between rounded-md p-2 text-left text-xs transition ${
                            isSelected
                              ? 'bg-[#17324A] text-white font-bold cursor-pointer'
                              : leaderConflict
                              ? 'bg-amber-50/70 text-amber-800 opacity-70 cursor-not-allowed'
                              : 'hover:bg-[#EAF2F8] text-[#17324A] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img src={emp.avatar} alt={emp.name} className="h-6 w-6 rounded-full object-cover border border-[#B0D0EA]" />
                            <div className="truncate">
                              <p className="truncate font-semibold">{emp.name}</p>
                              <p className={`truncate text-[10px] ${isSelected ? 'text-white/80' : leaderConflict ? 'text-amber-800 font-semibold' : 'text-[#55708A]'}`}>
                                {leaderConflict || emp.role}
                              </p>
                            </div>
                          </div>
                          {isSelected && <UserCheck className="h-4 w-4 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Select Team Members */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#17324A]">Team Members (Optional)</label>
                  <span className="text-[10px] font-bold text-[#55708A]">{newTeamMemberIds.length} selected</span>
                </div>

                <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-[#B0D0EA] bg-[#F7FAFC] p-2 space-y-1">
                  {directoryEmployees
                    .filter((e) => e.id !== newTeamLeaderId)
                    .filter((e) => !modalSearchQuery || e.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) || e.role.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                    .map((emp) => {
                      const isChecked = newTeamMemberIds.includes(emp.id);
                      const targetDept = newTeamDept.trim() || currentUser.department || 'Engineering';
                      const memberConflict = getMemberConflictForDept(emp.id, targetDept, teams);

                      return (
                        <label
                          key={emp.id}
                          className={`flex items-center justify-between rounded-md p-2 text-xs transition ${
                            memberConflict
                              ? 'bg-amber-50/70 opacity-70 cursor-not-allowed'
                              : isChecked
                              ? 'bg-[#B0D0EA]/40 font-bold cursor-pointer'
                              : 'hover:bg-[#EAF2F8] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              disabled={Boolean(memberConflict)}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewTeamMemberIds((prev) => [...prev, emp.id]);
                                } else {
                                  setNewTeamMemberIds((prev) => prev.filter((id) => id !== emp.id));
                                }
                              }}
                              className="rounded border-[#B0D0EA] text-[#17324A] focus:ring-[#17324A]"
                            />
                            <img src={emp.avatar} alt={emp.name} className="h-6 w-6 rounded-full object-cover border border-[#B0D0EA]" />
                            <div className="truncate">
                              <p className="truncate font-semibold text-[#17324A]">{emp.name}</p>
                              <p className={`truncate text-[10px] ${memberConflict ? 'text-amber-800 font-semibold' : 'text-[#55708A]'}`}>
                                {memberConflict || emp.role}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#17324A]">Team Focus / Description</label>
                <input
                  type="text"
                  value={newTeamFocus}
                  onChange={(e) => setNewTeamFocus(e.target.value)}
                  placeholder="e.g. Feature delivery and quarterly sprint execution"
                  className="mt-1 w-full rounded-lg border border-[#B0D0EA] px-3 py-2 text-xs font-medium text-[#17324A] outline-none focus:border-[#17324A] focus:ring-2 focus:ring-[#B0D0EA]/60"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#D9E5EE] pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim() || !newTeamLeaderId || isSubmitting}
                  className="rounded-lg border border-[#17324A] bg-[#17324A] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#17324A]/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Creating Team...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-red-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#17324A]">Delete Team?</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#55708A]">
                You are about to delete <strong>{deletingTeam.name}</strong>.
                This action will remove the team assignment in PostgreSQL.
              </p>
              <p className="mt-1 text-[11px] text-[#7890A5]">
                Employee records and team members will remain completely safe in the organization directory.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeletingTeam(null)}
                className="rounded-lg border border-[#B0D0EA] bg-white px-4 py-2 text-xs font-bold text-[#17324A] hover:bg-[#EAF2F8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteTeam}
                className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 409 Conflict Error Modal */}
      {conflictErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-300 bg-white shadow-2xl space-y-4 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-100 p-2 text-rose-600">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#17324A]">{conflictErrorModal.title}</h3>
                <p className="mt-1 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {conflictErrorModal.message}
                </p>
                {conflictErrorModal.conflict && (
                  <div className="mt-3 text-[11px] text-[#55708A] space-y-1 bg-[#F7FAFC] border border-[#B0D0EA] p-3 rounded-lg">
                    <p><strong className="text-[#17324A]">Employee:</strong> {conflictErrorModal.conflict.employeeName}</p>
                    <p><strong className="text-[#17324A]">Existing Team:</strong> {conflictErrorModal.conflict.existingTeamName}</p>
                    <p><strong className="text-[#17324A]">Department:</strong> {conflictErrorModal.conflict.department}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#D9E5EE]">
              <button
                type="button"
                onClick={() => setConflictErrorModal(null)}
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-bold text-white hover:bg-[#17324A]/90 cursor-pointer"
              >
                Understand & Refresh Data
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          canViewCompensation={false}
          canViewFullProfile
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
