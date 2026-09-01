'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ListTodo,
  Plus,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';

import type { DirectReport } from '@/features/tasks/api/tasks';
import {
  useCreateTask,
  useDeleteTask,
  useDirectReports,
  useMyTasks,
  useTeamTasks,
  useUpdateTask,
} from '@/features/tasks/hooks/useTasks';
import {
  isTaskOverdue,
  TASK_STATUS_LABELS,
  TASK_STATUS_OPTIONS,
} from '@/features/tasks/types/task';
import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
} from '@/features/tasks/types/task';
import { useHRMS } from '@/shared/providers/HRMSContext';

type TabId = 'assigned' | 'own' | 'team';
type StatusFilter = TaskStatus | 'All';

const inputStyles =
  'w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40';

const priorityStyles: Record<TaskPriority, string> = {
  High: 'border-red-200 bg-red-50 text-red-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const statusStyles: Record<TaskStatus, string> = {
  ToDo: 'border-amber-200 bg-amber-50 text-amber-700',
  InProgress: 'border-blue-200 bg-blue-50 text-blue-700',
  Done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));

// Open tasks first (earliest due date at the top), completed tasks last.
const sortTasks = (tasks: Task[]) =>
  [...tasks].sort((left, right) => {
    if (left.status === 'Done' && right.status !== 'Done') return 1;
    if (right.status === 'Done' && left.status !== 'Done') return -1;
    return (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31');
  });

const initialsFor = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

interface TaskCardProps {
  task: Task;
  isUpdating: boolean;
  isDeleting: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onDelete: () => void;
}

function TaskCard({ task, isUpdating, isDeleting, onStatusChange, onDelete }: TaskCardProps) {
  const overdue = isTaskOverdue(task);

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
        overdue ? 'border-red-200' : 'border-[#D9E5EE]'
      } ${task.status === 'Done' ? 'opacity-75' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${priorityStyles[task.priority]}`}>
          {task.priority} priority
        </span>
        <div className="flex items-center gap-1.5">
          <select
            value={task.status}
            disabled={isUpdating}
            onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
            className={`cursor-pointer rounded-full border px-2 py-0.5 text-[9px] font-bold outline-none ${statusStyles[task.status]}`}
            aria-label={`Update status for ${task.title}`}
          >
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg p-1 text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            title="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className={`mt-2 text-sm font-bold text-[#17324A] ${task.status === 'Done' ? 'line-through' : ''}`}>
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#52677A]">{task.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[#E4EBF1] pt-3 text-[10px] text-[#667085]">
        <span className="inline-flex items-center gap-1">
          <UserRound className="h-3 w-3" />
          {task.assignedBy ? `From ${task.assignedBy.name}` : 'Self'}
        </span>
        {task.dueDate && (
          <span className={`inline-flex items-center gap-1 font-semibold ${overdue ? 'text-red-600' : ''}`}>
            <CalendarDays className="h-3 w-3" />
            Due {formatDate(task.dueDate)}
          </span>
        )}
        {overdue && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-bold text-red-700">
            <AlertTriangle className="h-3 w-3" /> Overdue
          </span>
        )}
        {task.status === 'Done' && task.completedAt && (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Completed {formatDate(task.completedAt.slice(0, 10))}
          </span>
        )}
      </div>
    </article>
  );
}

interface TaskFormModalProps {
  mode: 'self' | 'assign';
  directReports: DirectReport[];
  defaultAssigneeId?: string;
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput) => void;
}

function TaskFormModal({
  mode,
  directReports,
  defaultAssigneeId,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? '');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      dueDate: dueDate || null,
      priority,
      ...(mode === 'assign' ? { assignedToId: assigneeId } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/45 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E5EE] bg-[#F7FAFC] px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#17324A]">
              {mode === 'assign' ? 'Assign Task' : 'New Task'}
            </h3>
            <p className="mt-0.5 text-xs text-[#55708A]">
              {mode === 'assign'
                ? 'Create a task for one of your direct reports.'
                : 'Create a personal task to track your own work.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#55708A] transition hover:bg-[#EAF2F8] hover:text-[#17324A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === 'assign' && (
            <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
              Assign to
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                required
                className={inputStyles}
              >
                <option value="" disabled>
                  Select a direct report
                </option>
                {directReports.map((report) => (
                  <option key={report.id} value={report.id}>
                    {report.name}
                    {report.roleTitle ? ` — ${report.roleTitle}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              maxLength={150}
              required
              className={inputStyles}
            />
          </label>

          <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
            Description <span className="font-normal text-[#98A2B3]">(optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, links, or acceptance criteria..."
              rows={4}
              maxLength={2000}
              className={`${inputStyles} resize-none`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
              Due date <span className="font-normal text-[#98A2B3]">(optional)</span>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={inputStyles}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className={inputStyles}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#D9E5EE] bg-white px-4 py-2.5 text-xs font-bold text-[#55708A] transition hover:bg-[#F7FAFC]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#17324A] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#1F4363] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {isSubmitting ? 'Saving...' : mode === 'assign' ? 'Assign task' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TasksPageContent() {
  const { currentUser } = useHRMS();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>('assigned');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [teamAssigneeFilter, setTeamAssigneeFilter] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState<StatusFilter>('All');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<'self' | 'assign'>('self');
  const [prefilledAssigneeId, setPrefilledAssigneeId] = useState<string | undefined>(undefined);
  const [pendingAssignDeepLink, setPendingAssignDeepLink] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const isManagerOrAdmin = currentUser.userRole === 'manager' || currentUser.userRole === 'admin';

  const myTasksQuery = useMyTasks();
  const directReportsQuery = useDirectReports(isManagerOrAdmin);
  // The full manager-scoped list is fetched once; assignee/status filtering
  // happens client-side so the overdue stat always covers the whole team.
  const teamTasksQuery = useTeamTasks({}, isManagerOrAdmin);

  const tasks = myTasksQuery.data ?? [];
  const directReports = directReportsQuery.data ?? [];
  const teamTasks = teamTasksQuery.data?.tasks ?? [];
  const teamOverdueCount = teamTasksQuery.data?.meta.overdueCount ?? 0;

  const canManageTeamTasks = isManagerOrAdmin && directReports.length > 0;

  const assignedToMe = useMemo(
    () => sortTasks(tasks.filter((task) => task.assignedBy !== null)),
    [tasks],
  );
  const myOwnTasks = useMemo(
    () => sortTasks(tasks.filter((task) => task.assignedBy === null)),
    [tasks],
  );

  // Deep links from My Team: /tasks?tab=team&assignee=<id>&assign=1
  useEffect(() => {
    const tab = searchParams.get('tab');
    const assignee = searchParams.get('assignee');
    if (assignee) setTeamAssigneeFilter(assignee);
    if (tab === 'own') setActiveTab('own');
    if (tab === 'team' && isManagerOrAdmin) setActiveTab('team');
    if (tab === 'team' && searchParams.get('assign') === '1' && assignee) {
      setPendingAssignDeepLink(assignee);
    }
  }, [searchParams, isManagerOrAdmin]);

  // Wait for the direct-report list before opening the pre-filled assign modal.
  useEffect(() => {
    if (!pendingAssignDeepLink || directReportsQuery.isLoading) return;
    if (directReports.some((report) => report.id === pendingAssignDeepLink)) {
      setCreateMode('assign');
      setPrefilledAssigneeId(pendingAssignDeepLink);
      setIsCreateOpen(true);
    }
    setPendingAssignDeepLink(null);
  }, [pendingAssignDeepLink, directReportsQuery.isLoading, directReports]);

  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const updatingTaskId = updateMutation.isPending ? updateMutation.variables?.id ?? null : null;
  const deletingTaskId = deleteMutation.isPending ? deleteMutation.variables ?? null : null;

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    setActionError('');
    updateMutation.mutate(
      { id: task.id, input: { status } },
      { onError: (error) => setActionError(error.message) },
    );
  };

  const handleDelete = (task: Task) => {
    if (!window.confirm(`Delete task "${task.title}"? This cannot be undone.`)) return;
    setActionError('');
    deleteMutation.mutate(task.id, { onError: (error) => setActionError(error.message) });
  };

  const openSelfTaskModal = () => {
    setCreateMode('self');
    setPrefilledAssigneeId(undefined);
    setIsCreateOpen(true);
  };

  const openAssignTaskModal = () => {
    setCreateMode('assign');
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setPrefilledAssigneeId(undefined);
  };

  const handleCreateSubmit = (input: CreateTaskInput) => {
    createMutation.mutate(input, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setPrefilledAssigneeId(undefined);
      },
    });
  };

  // Managers/admins may modify a team task only when they assigned it
  // (mirrors the API's assignee/assigner/admin rule).
  const canModifyTeamTask = (task: Task) =>
    currentUser.userRole === 'admin' || task.assignedBy?.id === currentUser.id;

  const tabs: Array<{ id: TabId; label: string; count?: number }> = [
    { id: 'assigned', label: 'Assigned to Me', count: assignedToMe.length },
    { id: 'own', label: 'My Own Tasks', count: myOwnTasks.length },
  ];
  if (canManageTeamTasks) {
    tabs.push({ id: 'team', label: "My Team's Tasks", count: teamTasks.length });
  }
  const activeId: TabId = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'assigned';

  const statusFilters: StatusFilter[] = ['All', ...TASK_STATUS_OPTIONS];
  const filteredAssigned =
    statusFilter === 'All' ? assignedToMe : assignedToMe.filter((task) => task.status === statusFilter);
  const filteredOwn =
    statusFilter === 'All' ? myOwnTasks : myOwnTasks.filter((task) => task.status === statusFilter);
  const visibleList = activeId === 'own' ? filteredOwn : filteredAssigned;

  // Ignore stale assignee filters that no longer match a direct report
  // (e.g. a hand-edited deep link) so the select never renders blank.
  const effectiveTeamAssigneeFilter = directReports.some((report) => report.id === teamAssigneeFilter)
    ? teamAssigneeFilter
    : '';
  const filteredTeamTasks = teamTasks.filter(
    (task) =>
      (!effectiveTeamAssigneeFilter || task.assignedTo.id === effectiveTeamAssigneeFilter) &&
      (teamStatusFilter === 'All' || task.status === teamStatusFilter),
  );

  const teamOpenCount = teamTasks.filter((task) => task.status !== 'Done').length;
  const teamInProgressCount = teamTasks.filter((task) => task.status === 'InProgress').length;
  const teamDoneCount = teamTasks.filter((task) => task.status === 'Done').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#315B76]">
          <ListTodo className="h-4 w-4" /> My Work
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#17324A]">Tasks</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#667085]">
          Track work assigned to you, manage your personal to-do list
          {canManageTeamTasks ? ', and follow up on tasks across your team.' : '.'}
        </p>
      </header>

      {actionError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span className="font-semibold">{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError('')}
            className="shrink-0 font-bold hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#D9E5EE] bg-white p-1.5 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-bold transition ${
                activeId === tab.id
                  ? 'bg-[#17324A] text-white'
                  : 'text-[#55708A] hover:bg-[#EAF2F8] hover:text-[#17324A]'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && <span className="ml-1.5 opacity-70">{tab.count}</span>}
            </button>
          ))}
        </div>

        {activeId === 'own' && (
          <button
            type="button"
            onClick={openSelfTaskModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1F4363]"
          >
            <Plus className="h-3.5 w-3.5" /> New Task
          </button>
        )}
        {activeId === 'team' && (
          <button
            type="button"
            onClick={openAssignTaskModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#1F4363]"
          >
            <Plus className="h-3.5 w-3.5" /> Assign Task
          </button>
        )}
      </div>

      {activeId !== 'team' && (
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold transition ${
                statusFilter === filter
                  ? 'border-[#17324A] bg-[#17324A] text-white'
                  : 'border-[#D9E5EE] bg-white text-[#55708A] hover:border-[#9FC4E1] hover:text-[#17324A]'
              }`}
            >
              {filter === 'All' ? 'All statuses' : TASK_STATUS_LABELS[filter]}
            </button>
          ))}
        </div>
      )}

      {activeId !== 'team' &&
        (myTasksQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl bg-[#F1F3F5]" />
            ))}
          </div>
        ) : myTasksQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-10 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-2 text-sm font-bold text-[#17324A]">Tasks could not be loaded</p>
            <p className="mt-1 text-xs text-[#667085]">Please refresh the page and try again.</p>
          </div>
        ) : visibleList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#B0D0EA] bg-[#F9FBFD] px-5 py-12 text-center">
            <ListTodo className="mx-auto h-8 w-8 text-[#9FC2DC]" />
            <p className="mt-2 text-sm font-bold text-[#17324A]">
              {activeId === 'own' ? 'No personal tasks yet' : 'No tasks assigned to you'}
            </p>
            <p className="mt-1 text-xs text-[#667085]">
              {activeId === 'own'
                ? 'Use the New Task button to create your first personal task.'
                : statusFilter === 'All'
                  ? 'Tasks assigned by your manager will appear here.'
                  : 'No tasks match the selected status filter.'}
            </p>
          </div>
        ) : (
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleList.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isUpdating={updatingTaskId === task.id}
                isDeleting={deletingTaskId === task.id}
                onStatusChange={(status) => handleStatusChange(task, status)}
                onDelete={() => handleDelete(task)}
              />
            ))}
          </div>
        ))}

      {activeId === 'team' && (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-[#17324A]">{teamOpenCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                Open tasks
              </p>
            </div>
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-[#17324A]">{teamInProgressCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                In progress
              </p>
            </div>
            <div className="rounded-xl border border-[#D9E5EE] bg-white p-4 shadow-sm">
              <p className="text-2xl font-black text-[#17324A]">{teamDoneCount}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                Completed
              </p>
            </div>
            <div
              className={`rounded-xl border p-4 shadow-sm ${
                teamOverdueCount > 0 ? 'border-red-200 bg-red-50' : 'border-[#D9E5EE] bg-white'
              }`}
            >
              <p
                className={`flex items-center gap-1.5 text-2xl font-black ${
                  teamOverdueCount > 0 ? 'text-red-600' : 'text-[#17324A]'
                }`}
              >
                {teamOverdueCount > 0 && <AlertTriangle className="h-5 w-5" />}
                {teamOverdueCount}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
                Overdue across team
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={effectiveTeamAssigneeFilter}
              onChange={(event) => setTeamAssigneeFilter(event.target.value)}
              className={`${inputStyles} w-auto min-w-44`}
              aria-label="Filter by assignee"
            >
              <option value="">All direct reports</option>
              {directReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>
            <select
              value={teamStatusFilter}
              onChange={(event) => setTeamStatusFilter(event.target.value as StatusFilter)}
              className={`${inputStyles} w-auto min-w-36`}
              aria-label="Filter by status"
            >
              <option value="All">All statuses</option>
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <span className="text-xs font-semibold text-[#667085]">
              Showing {filteredTeamTasks.length} of {teamTasks.length} tasks
            </span>
          </div>

          {teamTasksQuery.isLoading ? (
            <div className="h-64 animate-pulse rounded-xl bg-[#F1F3F5]" />
          ) : teamTasksQuery.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-10 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
              <p className="mt-2 text-sm font-bold text-[#17324A]">Team tasks could not be loaded</p>
              <p className="mt-1 text-xs text-[#667085]">Please refresh the page and try again.</p>
            </div>
          ) : filteredTeamTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#B0D0EA] bg-[#F9FBFD] px-5 py-12 text-center">
              <ListTodo className="mx-auto h-8 w-8 text-[#9FC2DC]" />
              <p className="mt-2 text-sm font-bold text-[#17324A]">No tasks to show</p>
              <p className="mt-1 text-xs text-[#667085]">
                {teamTasks.length === 0
                  ? 'Assign a task to one of your direct reports to get started.'
                  : 'No tasks match the selected filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#D9E5EE] bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[10px] font-bold uppercase tracking-wide text-[#5F7180]">
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Due date</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E5EE]">
                  {filteredTeamTasks.map((task) => {
                    const overdue = isTaskOverdue(task);
                    const canModify = canModifyTeamTask(task);
                    return (
                      <tr key={task.id} className="transition hover:bg-[#F5F9FC]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {task.assignedTo.avatarUrl ? (
                              <img
                                src={task.assignedTo.avatarUrl}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-full border border-[#B0D0EA] object-cover"
                              />
                            ) : (
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#B0D0EA] bg-[#EAF2F8] text-[10px] font-bold text-[#17324A]">
                                {initialsFor(task.assignedTo.name)}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#17324A]">{task.assignedTo.name}</p>
                              {task.assignedTo.roleTitle && (
                                <p className="truncate text-[10px] text-[#98A2B3]">
                                  {task.assignedTo.roleTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[280px] px-4 py-3">
                          <p
                            className={`font-semibold text-[#17324A] ${
                              task.status === 'Done' ? 'line-through opacity-70' : ''
                            }`}
                          >
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="mt-0.5 truncate text-[10px] text-[#667085]">{task.description}</p>
                          )}
                          <p className="mt-0.5 text-[9px] text-[#98A2B3]">
                            {task.assignedBy ? `By ${task.assignedBy.name}` : 'Self-created'}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {task.dueDate ? (
                            <span className={overdue ? 'font-bold text-red-600' : 'text-[#52677A]'}>
                              {formatDate(task.dueDate)}
                              {overdue ? ' · Overdue' : ''}
                            </span>
                          ) : (
                            <span className="text-[#98A2B3]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${priorityStyles[task.priority]}`}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canModify ? (
                            <select
                              value={task.status}
                              disabled={updatingTaskId === task.id}
                              onChange={(event) => handleStatusChange(task, event.target.value as TaskStatus)}
                              className={`cursor-pointer rounded-full border px-2 py-0.5 text-[9px] font-bold outline-none ${statusStyles[task.status]}`}
                              aria-label={`Update status for ${task.title}`}
                            >
                              {TASK_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {TASK_STATUS_LABELS[status]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${statusStyles[task.status]}`}
                            >
                              {TASK_STATUS_LABELS[task.status]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canModify && (
                            <button
                              type="button"
                              onClick={() => handleDelete(task)}
                              disabled={deletingTaskId === task.id}
                              className="rounded-lg p-1.5 text-[#98A2B3] transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {isCreateOpen && (
        <TaskFormModal
          mode={createMode}
          directReports={directReports}
          defaultAssigneeId={prefilledAssigneeId}
          isSubmitting={createMutation.isPending}
          error={createMutation.isError ? createMutation.error.message : null}
          onClose={closeCreateModal}
          onSubmit={handleCreateSubmit}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-[#F1F3F5]" />
          <div className="h-12 animate-pulse rounded-2xl bg-[#F1F3F5]" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-xl bg-[#F1F3F5]" />
            ))}
          </div>
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
