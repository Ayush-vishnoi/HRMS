import { NextResponse } from 'next/server';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  AuthorizationError,
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';
import { notifyUser } from '@/lib/notifications/notify';

const TASK_ID_RE = /^[0-9a-fA-F-]{36}$/;

const taskInclude = {
  assignedTo: {
    select: { id: true, name: true, email: true, roleTitle: true, avatarUrl: true },
  },
  assignedBy: {
    select: { id: true, name: true, email: true, roleTitle: true, avatarUrl: true },
  },
} as const;

const parsePriority = (value: unknown): TaskPriority => {
  if (value === 'Low' || value === 'Medium' || value === 'High') return value;
  return 'Medium';
};

const parseStatus = (value: unknown): TaskStatus | null => {
  if (value === 'ToDo' || value === 'InProgress' || value === 'Done') return value;
  return null;
};

const parseDueDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  // Normalise to UTC midnight so due-date comparisons are stable.
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
};

type TaskWithRelations = AsyncReturnType<typeof fetchTaskSample>;

// Helper only used for typing the formatter output.
async function fetchTaskSample() {
  return db.task.findFirstOrThrow({ include: taskInclude });
}

type AsyncReturnType<T extends (...args: never[]) => Promise<unknown>> = Awaited<ReturnType<T>>;

interface FormattedTask {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
  assignedTo: { id: string; name: string; email: string; roleTitle: string | null; avatarUrl: string | null };
  assignedBy: { id: string; name: string; email: string; roleTitle: string | null; avatarUrl: string | null } | null;
}

const formatTask = (task: TaskWithRelations): FormattedTask => ({
  id: task.id,
  title: task.title,
  description: task.description,
  dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
  priority: task.priority,
  status: task.status,
  createdAt: task.createdAt.toISOString(),
  completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  assignedTo: task.assignedTo,
  assignedBy: task.assignedBy,
});

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee(request);
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') ?? 'self';

    // ---- Manager/admin: tasks across direct reports ----
    if (scope === 'team') {
      if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
        throw new AuthorizationError();
      }

      const assigneeId = searchParams.get('assigneeId');
      const statusFilter = parseStatus(searchParams.get('status'));

      // SECURITY: tasks are restricted to the signed-in manager's direct
      // reports (Employee.managerId hierarchy). Admins see all tasks.
      const tasks = await db.task.findMany({
        where: {
          ...(employee.userRole === 'admin'
            ? {}
            : { assignedTo: { managerId: employee.id } }),
          ...(assigneeId
            ? {
                assignedToId: assigneeId,
                // Belt-and-braces: even for admins, an explicit assigneeId
                // filter must stay inside the reporting chain for managers.
                ...(employee.userRole === 'manager'
                  ? { assignedTo: { managerId: employee.id } }
                  : {}),
              }
            : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        include: taskInclude,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      });

      const overdueCount = tasks.filter(
        (task) =>
          task.status !== TaskStatus.Done &&
          task.dueDate !== null &&
          task.dueDate.getTime() < startOfTodayUtc().getTime(),
      ).length;

      return NextResponse.json({
        success: true,
        data: tasks.map(formatTask),
        meta: { overdueCount },
      });
    }

    // ---- Default: the signed-in employee's own tasks ----
    const tasks = await db.task.findMany({
      where: { assignedToId: employee.id },
      include: taskInclude,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: tasks.map(formatTask) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee(request);
    const body = await request.json();
    const { title, description, dueDate, priority, assignedToId } = body ?? {};

    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    if (title.trim().length > 150) {
      return NextResponse.json({ success: false, error: 'Title must be 150 characters or fewer' }, { status: 400 });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid description' }, { status: 400 });
    }

    let targetAssigneeId = employee.id;
    let assignedById: string | null = null;

    if (typeof assignedToId === 'string' && assignedToId && assignedToId !== employee.id) {
      // Assigning to someone else is a manager/admin capability and must be
      // restricted to the manager's direct reports at the query level.
      if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
        throw new AuthorizationError();
      }

      const directReport = await db.employee.findFirst({
        where: {
          id: assignedToId,
          ...(employee.userRole === 'admin' ? {} : { managerId: employee.id }),
        },
        select: { id: true, name: true },
      });

      if (!directReport) {
        return NextResponse.json(
          { success: false, error: 'Assignee must be one of your direct reports' },
          { status: 403 },
        );
      }

      targetAssigneeId = directReport.id;
      assignedById = employee.id;
    }

    const created = await db.task.create({
      data: {
        id: crypto.randomUUID(),
        title: title.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        assignedToId: targetAssigneeId,
        assignedById,
        dueDate: parseDueDate(dueDate),
        priority: parsePriority(priority),
        status: TaskStatus.ToDo,
      },
      include: taskInclude,
    });

    if (assignedById && targetAssigneeId !== assignedById) {
      await notifyUser({
        userId: targetAssigneeId,
        title: 'New task assigned',
        message: `${employee.name} assigned you a task: "${created.title}"`,
        type: 'Task',
        linkUrl: '/tasks',
      });
    }

    return NextResponse.json({ success: true, data: formatTask(created) }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, title, description, dueDate, priority } = body ?? {};

    if (typeof id !== 'string' || !TASK_ID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'A valid task id is required' }, { status: 400 });
    }

    const existing = await db.task.findUnique({ where: { id }, select: { id: true, assignedToId: true, assignedById: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // SECURITY: only the assignee, the assigner, or an admin may update a task.
    // requireEmployeeAccess allows: admin, self (assignee), or the assignee's
    // direct manager. The assigner check below additionally covers a manager
    // who assigned the task to someone outside their current reporting chain.
    const employee = await requireEmployeeAccess(existing.assignedToId);
    const isAssignee = employee.id === existing.assignedToId;
    const isAssigner = existing.assignedById === employee.id;
    const isAdmin = employee.userRole === 'admin';
    if (!isAssignee && !isAssigner && !isAdmin) {
      throw new AuthorizationError();
    }

    const data: Record<string, unknown> = {};

    if (status !== undefined) {
      const parsed = parseStatus(status);
      if (!parsed) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      data.status = parsed;
      data.completedAt = parsed === TaskStatus.Done ? new Date() : null;
    }

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      }
      if (title.trim().length > 150) {
        return NextResponse.json({ success: false, error: 'Title must be 150 characters or fewer' }, { status: 400 });
      }
      data.title = title.trim();
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid description' }, { status: 400 });
      }
      data.description = description && description.trim() ? description.trim() : null;
    }

    if (dueDate !== undefined) {
      data.dueDate = parseDueDate(dueDate);
    }

    if (priority !== undefined) {
      data.priority = parsePriority(priority);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await db.task.update({
      where: { id },
      data,
      include: taskInclude,
    });

    // Notify the assigner when the assignee completes a task.
    if (
      data.status === TaskStatus.Done &&
      updated.assignedById &&
      updated.assignedById !== employee.id
    ) {
      await notifyUser({
        userId: updated.assignedById,
        title: 'Task completed',
        message: `${employee.name} completed the task "${updated.title}"`,
        type: 'Task',
        linkUrl: '/tasks',
      });
    }

    return NextResponse.json({ success: true, data: formatTask(updated) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating task:', error);
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id } = body ?? {};

    if (typeof id !== 'string' || !TASK_ID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'A valid task id is required' }, { status: 400 });
    }

    const existing = await db.task.findUnique({ where: { id }, select: { id: true, assignedToId: true, assignedById: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    const employee = await requireEmployeeAccess(existing.assignedToId);
    const isAssignee = employee.id === existing.assignedToId;
    const isAssigner = existing.assignedById === employee.id;
    const isAdmin = employee.userRole === 'admin';
    if (!isAssignee && !isAssigner && !isAdmin) {
      throw new AuthorizationError();
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error deleting task:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 500 });
  }
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
