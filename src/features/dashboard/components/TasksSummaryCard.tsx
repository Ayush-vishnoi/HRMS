'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarDays, ListTodo } from 'lucide-react';
import { useMyTasks } from '@/features/tasks/hooks/useTasks';
import { isTaskOverdue } from '@/features/tasks/types/task';

const formatDueDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00.000Z`));

// Monday-based bounds of the current UTC week — backs the "due this week" chip.
const getCurrentWeekBoundsUtc = () => {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const weekStart = new Date(today.getTime() - daysSinceMonday * 86_400_000);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  return { weekStart, weekEnd };
};

const priorityPillStyles: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export function TasksSummaryCard() {
  const { data: tasks = [], isLoading, isError } = useMyTasks();

  const openTasks = tasks.filter((task) => task.status !== 'Done');
  const overdueTasks = openTasks.filter(isTaskOverdue);

  const { weekStart, weekEnd } = getCurrentWeekBoundsUtc();
  const dueThisWeekCount = openTasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(`${task.dueDate}T00:00:00.000Z`).getTime();
    return due >= weekStart.getTime() && due < weekEnd.getTime();
  }).length;

  const nextTasks = [...openTasks]
    .sort((left, right) =>
      (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31'),
    )
    .slice(0, 3);

  return (
    <section className="p-6 rounded-2xl bg-white border border-[#E1E5EA] shadow-md space-y-4">
      {/* Header — title with inline stat chips; "View All" pinned right. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <h3 className="min-w-0 flex items-center gap-2 text-sm font-bold text-[#1F2933]">
            <ListTodo className="w-4 h-4 shrink-0 text-[#8B3A4A]" />
            <span className="truncate">My Tasks</span>
          </h3>

          {/* Compact chips replace the old square stat tiles, freeing the
              full card width for the task list below. */}
          {!isLoading && !isError && (
            <>
              <span className="shrink-0 inline-flex items-center rounded-full border border-[#E1E5EA] bg-[#F7F8FA] px-2 py-0.5 text-[10px] font-semibold text-[#667085]">
                {dueThisWeekCount} due this week
              </span>
              <span
                className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  overdueTasks.length > 0
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-[#E1E5EA] bg-[#F7F8FA] text-[#667085]'
                }`}
              >
                {overdueTasks.length} overdue
              </span>
            </>
          )}
        </div>

        <Link
          href="/tasks"
          className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-[#667085] hover:text-[#8B3A4A] transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2" aria-label="Loading tasks">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-[#F1F3F5]" />
          ))}
        </div>
      ) : isError ? (
        <p className="text-xs text-rose-600">Your tasks could not be loaded.</p>
      ) : tasks.length === 0 ? (
        <div className="min-h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-[#E1E5EA] rounded-xl text-center bg-[#F7F8FA]">
          <ListTodo className="h-5 w-5 text-[#98A2B3]" />

          <p className="text-xs text-[#667085]">No tasks yet. Create one from the Tasks page.</p>
        </div>
      ) : nextTasks.length === 0 ? (
        <div className="min-h-32 flex flex-col items-center justify-center gap-2 border border-dashed border-[#E1E5EA] rounded-xl text-center bg-[#F7F8FA]">
          <ListTodo className="h-5 w-5 text-[#98A2B3]" />

          <p className="text-xs text-[#667085]">No open tasks — you're all caught up.</p>
        </div>
      ) : (
        <div className="min-w-0 divide-y divide-[#E1E5EA] border border-[#E1E5EA] rounded-xl overflow-hidden bg-white">
          {nextTasks.map((task) => {
            const overdue = isTaskOverdue(task);
            return (
              <Link
                key={task.id}
                href="/tasks"
                className="block p-3 hover:bg-[#F7F8FA] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#1F2933]">{task.title}</p>

                    <p
                      className={`mt-1 flex items-center gap-1 text-[10px] ${
                        overdue ? 'text-red-600 font-semibold' : 'text-[#667085]'
                      }`}
                    >
                      {overdue ? (
                        <AlertTriangle className="h-3 w-3 shrink-0 text-red-600" />
                      ) : (
                        <CalendarDays className="h-3 w-3 shrink-0 text-[#8B3A4A]" />
                      )}

                      {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : 'No due date'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-1 rounded-full text-[9px] font-semibold border ${priorityPillStyles[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
