import { authFetch } from '@/lib/api-client';
import type {
  CreateTaskInput,
  Task,
  TaskPriority,
  TaskStatus,
  TeamTaskFilters,
  TeamTasksMeta,
  UpdateTaskInput,
} from '@/features/tasks/types/task';

type ApiResponse<T> = { data?: T; meta?: TeamTasksMeta; error?: string };

async function readResponse<T>(res: Response, fallbackMessage: string): Promise<T> {
  const json = await res.json().catch(() => ({})) as ApiResponse<T>;
  if (!res.ok) throw new Error(json.error || fallbackMessage);
  if (json.data === undefined) throw new Error(fallbackMessage);
  return json.data;
}

export async function getMyTasks(): Promise<Task[]> {
  const res = await authFetch<Response>('/api/tasks', { raw: true });
  return readResponse<Task[]>(res, 'Failed to fetch tasks');
}

export async function getTeamTasks(filters: TeamTaskFilters = {}): Promise<{ tasks: Task[]; meta: TeamTasksMeta }> {
  const params = new URLSearchParams();
  params.set('scope', 'team');
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.status) params.set('status', filters.status);

  const res = await authFetch<Response>(`/api/tasks?${params.toString()}`, { raw: true });
  const json = await res.json().catch(() => ({})) as ApiResponse<Task[]> & { overdueCount?: number };
  if (!res.ok) throw new Error(json.error || 'Failed to fetch team tasks');
  if (json.data === undefined) throw new Error('Failed to fetch team tasks');
  return { tasks: json.data, meta: json.meta ?? { overdueCount: json.overdueCount ?? 0 } };
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  const res = await authFetch<Response>('/api/tasks', { raw: true,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return readResponse<Task>(res, 'Failed to create task');
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const res = await authFetch<Response>('/api/tasks', { raw: true,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...input }),
  });
  return readResponse<Task>(res, 'Failed to update task');
}

export async function deleteTask(id: string): Promise<{ id: string }> {
  const res = await authFetch<Response>('/api/tasks', { raw: true,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  return readResponse<{ id: string }>(res, 'Failed to delete task');
}

export interface DirectReport {
  id: string;
  name: string;
  email: string;
  roleTitle: string | null;
  avatarUrl: string | null;
}

export async function getDirectReports(): Promise<DirectReport[]> {
  const res = await authFetch<Response>('/api/tasks/direct-reports', { raw: true });
  return readResponse<DirectReport[]>(res, 'Failed to fetch direct reports');
}

export type { TaskPriority, TaskStatus };
