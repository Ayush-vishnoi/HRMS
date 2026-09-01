'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTask,
  deleteTask,
  getDirectReports,
  getMyTasks,
  getTeamTasks,
  updateTask,
} from '@/features/tasks/api/tasks';
import type {
  CreateTaskInput,
  TeamTaskFilters,
  UpdateTaskInput,
} from '@/features/tasks/types/task';

export const taskKeys = {
  all: ['tasks'] as const,
  my: ['tasks', 'my'] as const,
  team: (filters: TeamTaskFilters) => ['tasks', 'team', filters] as const,
  directReports: ['tasks', 'direct-reports'] as const,
};

export function useMyTasks() {
  return useQuery({ queryKey: taskKeys.my, queryFn: getMyTasks });
}

export function useTeamTasks(filters: TeamTaskFilters = {}, enabled = true) {
  return useQuery({
    queryKey: taskKeys.team(filters),
    queryFn: () => getTeamTasks(filters),
    enabled,
  });
}

export function useDirectReports(enabled = true) {
  return useQuery({
    queryKey: taskKeys.directReports,
    queryFn: getDirectReports,
    enabled,
    staleTime: 60_000,
  });
}

function invalidateTasks(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: taskKeys.all });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) => updateTask(id, input),
    onSuccess: () => invalidateTasks(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => invalidateTasks(queryClient),
  });
}
