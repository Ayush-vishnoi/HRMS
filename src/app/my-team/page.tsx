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
  Target,
  UsersRound,
} from 'lucide-react';

import { useHRMS } from '@/context/HRMSContext';
import {
  Employee,
  MOCK_TEAM_METADATA,
  TeamMemberMetadata,
} from '@/data/mockData';

import { EmployeeDetailsModal } from '@/components/modals/EmployeeDetailsModal';

const statusFilters = ['All', 'Active', 'Remote', 'On Leave'] as const;

type StatusFilter = (typeof statusFilters)[number];

const fallbackMetadata = (
  employee: Employee,
  manager: string
): TeamMemberMetadata => ({
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

/* ---------------- STATUS COLORS ---------------- */

const getRiskClasses = (risk: TeamMemberMetadata['risk']) => {
  if (risk === 'At risk') {
    return 'bg-red-50 text-red-600 border-red-200';
  }

  if (risk === 'Needs attention') {
    return 'bg-amber-50 text-amber-600 border-amber-200';
  }

  return 'bg-emerald-50 text-emerald-600 border-emerald-200';
};

const getStatusClasses = (status: Employee['status']) => {
  if (status === 'On Leave') {
    return 'bg-amber-50 text-amber-600 border-amber-200';
  }

  if (status === 'Remote') {
    return 'bg-[#B0D0EA]/60 text-[#17324A] border-[#B0D0EA]';
  }

  return 'bg-emerald-50 text-emerald-600 border-emerald-200';
};

export default function MyTeamPage() {
  const { currentUser, employees } = useHRMS();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>('All');

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [activeAction, setActiveAction] =
    useState<string | null>(null);

  const [notes, setNotes] =
    useState<Record<string, string>>({});

  /* ---------------- DIRECT REPORTS ---------------- */

  const directReports = useMemo(
    () =>
      employees.filter(
        (employee) => employee.manager === currentUser.name
      ),
    [currentUser.name, employees]
  );

  /* ---------------- TEAM DATA ---------------- */

  const team = useMemo(
    () =>
      directReports.map((employee) => ({
        employee,
        metadata:
          MOCK_TEAM_METADATA.find(
            (item) =>
              item.employeeId === employee.id &&
              item.manager === currentUser.name
          ) ??
          fallbackMetadata(employee, currentUser.name),
      })),
    [currentUser.name, directReports]
  );

  /* ---------------- FILTER ---------------- */

  const filteredTeam = useMemo(
    () =>
      team.filter(({ employee }) => {
        const searchText =
          `${employee.name} ${employee.role} ${employee.department}`
            .toLowerCase();

        const matchesQuery = searchText.includes(
          query.toLowerCase()
        );

        const matchesStatus =
          statusFilter === 'All' ||
          employee.status === statusFilter;

        return matchesQuery && matchesStatus;
      }),
    [query, statusFilter, team]
  );

  /* ---------------- TEAM STATS ---------------- */

  const averageWorkload = team.length
    ? Math.round(
        team.reduce(
          (total, member) =>
            total + member.metadata.workload,
          0
        ) / team.length
      )
    : 0;

  const averageGoalProgress = team.length
    ? Math.round(
        team.reduce(
          (total, member) =>
            total + member.metadata.goalProgress,
          0
        ) / team.length
      )
    : 0;

  const attentionCount = team.filter(
    ({ metadata }) => metadata.risk !== 'On track'
  ).length;

  /* ---------------- ACTION ---------------- */

  const showAction = (action: string) => {
    setActiveAction(action);

    window.setTimeout(() => {
      setActiveAction(null);
    }, 2600);
  };

  const saveNote = (employeeId: string) => {
    showAction('Team note saved');

    setNotes((current) => ({
      ...current,
      [employeeId]: notes[employeeId] ?? '',
    }));
  };

  /* ---------------- MANAGER ACCESS ---------------- */

  if (currentUser.userRole !== 'manager') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-2xl border border-[#B0D0EA] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#B0D0EA]/50">
            <UsersRound className="h-6 w-6 text-[#17324A]" />
          </div>

          <h2 className="text-lg font-bold text-[#17324A]">
            Manager access required
          </h2>

          <p className="mt-2 text-sm text-[#55708A]">
            This workspace is available only to people managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#17324A]">
            Manager workspace
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17324A]">
            My Team
          </h1>

          <p className="mt-1 text-sm text-[#55708A]">
            Manage delivery, capacity, and regular check-ins
            for your direct reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            showAction('Team planning session created')
          }
          className="
            inline-flex items-center justify-center gap-2
            rounded-lg
            bg-[#B0D0EA]
            px-4 py-2.5
            text-xs font-bold
            text-[#17324A]
            border border-[#9FC4E1]
            shadow-sm
            transition-all
            hover:bg-[#9FC4E1]
            hover:border-[#8FB8D8]
            hover:shadow-md
          "
        >
          <CalendarDays className="h-4 w-4" />
          Plan team session
        </button>
      </div>

      {/* ================= ACTION MESSAGE ================= */}

      {activeAction && (
        <div
          role="status"
          className="
            flex items-center gap-2
            rounded-lg
            border border-emerald-200
            bg-emerald-50
            px-3 py-2
            text-xs font-medium
            text-emerald-600
          "
        >
          <Check className="h-4 w-4" />
          {activeAction}
        </div>
      )}

      {/* ================= STAT CARDS ================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Direct Reports */}

        <div
          className="
            rounded-xl
            border border-[#B0D0EA]
            bg-white
            p-5
            shadow-sm
            transition-all
            hover:border-[#9FC4E1]
            hover:shadow-md
          "
        >
          <div className="flex items-start justify-between">

            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#55708A]">
              Direct reports
            </span>

            <div className="rounded-lg bg-[#B0D0EA]/50 p-2">
              <UsersRound className="h-4 w-4 text-[#17324A]" />
            </div>
          </div>

          <p className="mt-4 text-2xl font-bold text-[#17324A]">
            {team.length}
          </p>

          <p className="mt-1 text-[11px] text-[#55708A]">
            Reporting to you
          </p>
        </div>

        {/* Average Workload */}

        <div
          className="
            rounded-xl
            border border-[#B0D0EA]
            bg-white
            p-5
            shadow-sm
            transition-all
            hover:border-[#9FC4E1]
            hover:shadow-md
          "
        >
          <div className="flex items-start justify-between">

            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#55708A]">
              Average workload
            </span>

            <div className="rounded-lg bg-[#B0D0EA]/50 p-2">
              <Clock3 className="h-4 w-4 text-[#17324A]" />
            </div>
          </div>

          <p className="mt-4 text-2xl font-bold text-[#17324A]">
            {averageWorkload}%
          </p>

          <p className="mt-1 text-[11px] text-[#55708A]">
            Team capacity used
          </p>
        </div>

        {/* Goal Progress */}

        <div
          className="
            rounded-xl
            border border-[#B0D0EA]
            bg-white
            p-5
            shadow-sm
            transition-all
            hover:border-[#9FC4E1]
            hover:shadow-md
          "
        >
          <div className="flex items-start justify-between">

            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#55708A]">
              Goal progress
            </span>

            <div className="rounded-lg bg-[#B0D0EA]/50 p-2">
              <Target className="h-4 w-4 text-[#17324A]" />
            </div>
          </div>

          <p className="mt-4 text-2xl font-bold text-[#17324A]">
            {averageGoalProgress}%
          </p>

          <p className="mt-1 text-[11px] text-[#55708A]">
            Average this quarter
          </p>
        </div>

        {/* Attention */}

        <div
          className="
            rounded-xl
            border border-[#B0D0EA]
            bg-white
            p-5
            shadow-sm
            transition-all
            hover:border-[#9FC4E1]
            hover:shadow-md
          "
        >
          <div className="flex items-start justify-between">

            <span className="text-[11px] font-semibold uppercase tracking-wide text-[#55708A]">
              Needs attention
            </span>

            <div className="rounded-lg bg-amber-50 p-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          </div>

          <p className="mt-4 text-2xl font-bold text-[#17324A]">
            {attentionCount}
          </p>

          <p className="mt-1 text-[11px] text-[#55708A]">
            Follow-ups to review
          </p>
        </div>
      </div>

      {/* ================= TEAM ROSTER ================= */}

      <section
        className="
          rounded-xl
          border border-[#B0D0EA]
          bg-white
          shadow-sm
          overflow-hidden
        "
      >

        {/* Section Header */}

        <div
          className="
            flex flex-col gap-4
            border-b border-[#B0D0EA]
            bg-[#B0D0EA]/20
            p-5
            md:flex-row
            md:items-center
            md:justify-between
          "
        >

          <div>
            <h2 className="text-sm font-bold text-[#17324A]">
              Team roster
            </h2>

            <p className="mt-1 text-xs text-[#55708A]">
              {filteredTeam.length} of {team.length} team
              members shown
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            {/* Search */}

            <label className="relative block">

              <Search
                className="
                  pointer-events-none
                  absolute left-3 top-1/2
                  h-3.5 w-3.5
                  -translate-y-1/2
                  text-[#55708A]
                "
              />

              <input
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search team"
                className="
                  w-full
                  rounded-lg
                  border border-[#B0D0EA]
                  bg-white
                  py-2
                  pl-9
                  pr-3
                  text-xs
                  text-[#17324A]
                  outline-none
                  placeholder:text-[#7890A5]
                  transition-all
                  focus:border-[#17324A]
                  focus:ring-2
                  focus:ring-[#B0D0EA]/60
                  sm:w-52
                "
              />
            </label>

            {/* Status Filter */}

            <label className="relative">

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as StatusFilter
                  )
                }
                className="
                  w-full
                  appearance-none
                  rounded-lg
                  border border-[#B0D0EA]
                  bg-white
                  py-2
                  pl-3
                  pr-9
                  text-xs
                  font-medium
                  text-[#17324A]
                  outline-none
                  transition-all
                  focus:border-[#17324A]
                  focus:ring-2
                  focus:ring-[#B0D0EA]/60
                "
              >
                <option value="All">
                  All availability
                </option>

                {statusFilters
                  .slice(1)
                  .map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {status}
                    </option>
                  ))}
              </select>

              <ChevronDown
                className="
                  pointer-events-none
                  absolute right-3 top-1/2
                  h-3.5 w-3.5
                  -translate-y-1/2
                  text-[#55708A]
                "
              />
            </label>
          </div>
        </div>

        {/* ================= TEAM MEMBERS ================= */}

        {filteredTeam.length === 0 ? (

          <div className="p-12 text-center">

            <UsersRound className="mx-auto h-8 w-8 text-[#9AB6CC]" />

            <p className="mt-3 text-sm font-semibold text-[#17324A]">
              No team members found
            </p>

            <p className="mt-1 text-xs text-[#55708A]">
              No direct reports match the current filters.
            </p>
          </div>

        ) : (

          <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">

            {filteredTeam.map(
              ({ employee, metadata }) => (

                <article
                  key={employee.id}
                  className="
                    rounded-xl
                    border border-[#B0D0EA]
                    bg-white
                    p-5
                    transition-all
                    hover:border-[#9FC4E1]
                    hover:bg-[#B0D0EA]/10
                    hover:shadow-md
                  "
                >

                  {/* Employee Header */}

                  <div className="flex items-start gap-3">

                    <img
                      src={employee.avatar}
                      alt={employee.name}
                      className="
                        h-12 w-12
                        rounded-full
                        border-2
                        border-[#B0D0EA]
                        object-cover
                      "
                    />

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-start justify-between gap-2">

                        <div>
                          <h3 className="text-sm font-bold text-[#17324A]">
                            {employee.name}
                          </h3>

                          <p className="text-xs font-medium text-[#55708A]">
                            {employee.role}
                          </p>
                        </div>

                        <button
                          type="button"
                          aria-label={`More actions for ${employee.name}`}
                          title="More actions"
                          onClick={() =>
                            showAction(
                              `Actions opened for ${employee.name}`
                            )
                          }
                          className="
                            rounded-lg
                            p-1.5
                            text-[#55708A]
                            transition-colors
                            hover:bg-[#B0D0EA]
                            hover:text-[#17324A]
                          "
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Status */}

                      <div className="mt-2 flex flex-wrap gap-1.5">

                        <span
                          className={`
                            rounded-full
                            border
                            px-2.5
                            py-0.5
                            text-[10px]
                            font-semibold
                            ${getStatusClasses(
                              employee.status
                            )}
                          `}
                        >
                          {employee.status}
                        </span>

                        <span
                          className={`
                            rounded-full
                            border
                            px-2.5
                            py-0.5
                            text-[10px]
                            font-semibold
                            ${getRiskClasses(
                              metadata.risk
                            )}
                          `}
                        >
                          {metadata.risk}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Focus */}

                  <p className="mt-4 text-xs leading-5 text-[#55708A]">
                    {metadata.focus}
                  </p>

                  {/* Progress */}

                  <div className="mt-5 grid grid-cols-2 gap-5">

                    {/* Workload */}

                    <div>

                      <div
                        className="
                          flex justify-between
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-wide
                          text-[#7890A5]
                        "
                      >
                        <span>Workload</span>

                        <span className="text-[#17324A]">
                          {metadata.workload}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-[#DCEAF5]">

                        <div
                          className={`
                            h-full
                            rounded-full
                            ${
                              metadata.workload > 85
                                ? 'bg-amber-500'
                                : 'bg-[#17324A]'
                            }
                          `}
                          style={{
                            width: `${metadata.workload}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Goal */}

                    <div>

                      <div
                        className="
                          flex justify-between
                          text-[10px]
                          font-semibold
                          uppercase
                          tracking-wide
                          text-[#7890A5]
                        "
                      >
                        <span>Goal</span>

                        <span className="text-[#17324A]">
                          {metadata.goalProgress}%
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 rounded-full bg-[#DCEAF5]">

                        <div
                          className="
                            h-full
                            rounded-full
                            bg-[#17324A]
                          "
                          style={{
                            width: `${metadata.goalProgress}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Next 1:1 */}

                  <div
                    className="
                      mt-5
                      flex
                      items-center
                      justify-between
                      border-t
                      border-[#B0D0EA]
                      pt-4
                    "
                  >

                    <span className="text-[11px] text-[#55708A]">

                      <span className="text-[#7890A5]">
                        Next 1:1
                      </span>{' '}
                      {metadata.nextOneToOne}

                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        showAction(
                          `One-to-one requested with ${employee.name}`
                        )
                      }
                      className="
                        inline-flex
                        items-center
                        gap-1
                        text-[11px]
                        font-bold
                        text-[#17324A]
                        transition-colors
                        hover:text-[#55708A]
                      "
                    >
                      Schedule 1:1

                      <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Action Buttons */}

                  <div className="mt-4 flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEmployee(employee)
                      }
                      className="
                        inline-flex
                        flex-1
                        items-center
                        justify-center
                        gap-1.5
                        rounded-lg
                        border
                        border-[#B0D0EA]
                        bg-white
                        px-3
                        py-2
                        text-[11px]
                        font-bold
                        text-[#17324A]
                        transition-all
                        hover:bg-[#B0D0EA]
                        hover:border-[#9FC4E1]
                      "
                    >
                      <FileText className="h-3.5 w-3.5" />

                      View profile
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        showAction(
                          `Reminder sent to ${employee.name}`
                        )
                      }
                      className="
                        inline-flex
                        flex-1
                        items-center
                        justify-center
                        gap-1.5
                        rounded-lg
                        border
                        border-[#B0D0EA]
                        bg-[#B0D0EA]/40
                        px-3
                        py-2
                        text-[11px]
                        font-bold
                        text-[#17324A]
                        transition-all
                        hover:bg-[#B0D0EA]
                      "
                    >
                      <Mail className="h-3.5 w-3.5" />

                      Send reminder
                    </button>
                  </div>

                  {/* Manager Note */}

                  <details className="mt-4 border-t border-[#B0D0EA] pt-4">

                    <summary
                      className="
                        flex
                        cursor-pointer
                        list-none
                        items-center
                        gap-1.5
                        text-[11px]
                        font-bold
                        text-[#55708A]
                        transition-colors
                        hover:text-[#17324A]
                      "
                    >
                      <MessageSquare className="h-3.5 w-3.5" />

                      Manager note
                    </summary>

                    <textarea
                      value={
                        notes[employee.id] ??
                        metadata.notes
                      }
                      onChange={(event) =>
                        setNotes((current) => ({
                          ...current,
                          [employee.id]:
                            event.target.value,
                        }))
                      }
                      className="
                        mt-3
                        min-h-20
                        w-full
                        rounded-lg
                        border
                        border-[#B0D0EA]
                        bg-white
                        p-3
                        text-xs
                        text-[#17324A]
                        outline-none
                        placeholder:text-[#7890A5]
                        transition-all
                        focus:border-[#17324A]
                        focus:ring-2
                        focus:ring-[#B0D0EA]/60
                      "
                      placeholder="Write a manager note..."
                    />

                    <button
                      type="button"
                      onClick={() =>
                        saveNote(employee.id)
                      }
                      className="
                        mt-2
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-lg
                        bg-[#B0D0EA]
                        px-3
                        py-1.5
                        text-[11px]
                        font-bold
                        text-[#17324A]
                        border
                        border-[#9FC4E1]
                        transition-colors
                        hover:bg-[#9FC4E1]
                      "
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />

                      Save note
                    </button>
                  </details>

                </article>
              )
            )}

          </div>
        )}
      </section>

      {/* ================= EMPLOYEE MODAL ================= */}

      {selectedEmployee && (
        <EmployeeDetailsModal
          employee={selectedEmployee}
          onClose={() =>
            setSelectedEmployee(null)
          }
        />
      )}
    </div>
  );
}