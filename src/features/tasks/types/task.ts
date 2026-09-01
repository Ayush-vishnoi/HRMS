export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'ToDo' | 'InProgress' | 'Done';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  ToDo: 'To Do',
  InProgress: 'In Progress',
  Done: 'Done',
};

export const TASK_STATUS_OPTIONS: readonly TaskStatus[] = ['ToDo', 'InProgress', 'Done'];

export interface TaskEmployeeRef {
  id: string;
  name: string;
  email: string;
  roleTitle: string | null;
  avatarUrl: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  assignedTo: TaskEmployeeRef;
  assignedBy: TaskEmployeeRef | null;
}

export interface TeamTasksMeta {
  overdueCount: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  assignedToId?: string;
}

export interface UpdateTaskInput {
  status?: TaskStatus;
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
}

export interface TeamTaskFilters {
  assigneeId?: string;
  status?: TaskStatus;
}

export const isTaskOverdue = (task: Pick<Task, 'dueDate' | 'status'>): boolean => {
  if (task.status === 'Done' || !task.dueDate) return false;
  const todayUtc = new Date();
  const due = new Date(`${task.dueDate}T00:00:00.000Z`);
  return due.getTime() < Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate());
};
