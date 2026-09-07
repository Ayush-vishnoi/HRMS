import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaskStatus, TaskPriority, UserRole } from '@prisma/client';

const taskInclude = {
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      roleTitle: true,
      department: true,
    },
  },
  assignedBy: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      roleTitle: true,
      department: true,
    },
  },
};

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private formatTask(task: any) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : null,
      priority: task.priority,
      status: task.status,
      createdAt: task.createdAt ? new Date(task.createdAt).toISOString() : null,
      completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
      assignedTo: task.assignedTo,
      assignedBy: task.assignedBy,
    };
  }

  async findAll(userId: string, scope?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, userRole: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');

    if (scope === 'team') {
      if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
        throw new ForbiddenException('Manager or admin access required');
      }

      const tasks = await this.prisma.task.findMany({
        where:
          employee.userRole === 'admin'
            ? {}
            : {
                OR: [
                  { assignedTo: { managerId: employee.id } },
                  { assignedById: employee.id },
                ],
              },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        include: taskInclude,
      });

      const overdueCount = tasks.filter(
        (task) =>
          task.status !== TaskStatus.Done &&
          task.dueDate !== null &&
          task.dueDate.getTime() < Date.now(),
      ).length;

      return {
        overdueCount,
        data: tasks.map((t) => this.formatTask(t)),
      };
    }

    const tasks = await this.prisma.task.findMany({
      where: { assignedToId: employee.id },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      include: taskInclude,
    });

    return tasks.map((t) => this.formatTask(t));
  }

  async create(userId: string, body: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, name: true, userRole: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    const title = (body.title || '').trim();
    if (!title) throw new BadRequestException('Title is required');

    const assignedToId = typeof body.assignedToId === 'string' ? body.assignedToId.trim() : employee.id;
    const isSelfTask = assignedToId === employee.id;

    const count = await this.prisma.task.count();
    const newId = `TSK-${String(count + 1).padStart(4, '0')}`;

    const created = await this.prisma.task.create({
      data: {
        id: newId,
        title,
        description: (body.description || '').trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        priority: (body.priority || 'Medium') as TaskPriority,
        status: (body.status || 'ToDo') as TaskStatus,
        assignedToId,
        assignedById: isSelfTask ? null : employee.id,
      },
      include: taskInclude,
    });

    return this.formatTask(created);
  }

  async update(userId: string, body: any) {
    const id = body.id;
    if (!id) throw new BadRequestException('Task id is required');

    const existing = await this.prisma.task.findUnique({
      where: { id },
      select: { id: true, assignedToId: true, assignedById: true },
    });

    if (!existing) throw new NotFoundException('Task not found');

    const data: any = {};
    if (body.title) data.title = body.title.trim();
    if (body.description !== undefined) data.description = body.description.trim();
    if (body.priority) data.priority = body.priority as TaskPriority;
    if (body.status) {
      data.status = body.status as TaskStatus;
      if (body.status === 'Done') data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assignedToId) data.assignedToId = body.assignedToId;

    const updated = await this.prisma.task.update({
      where: { id },
      data,
      include: taskInclude,
    });

    return this.formatTask(updated);
  }

  async delete(userId: string, id: string) {
    await this.prisma.task.delete({ where: { id } });
    return { success: true, id };
  }

  /**
   * Direct reports of the signed-in manager (Employee.managerId hierarchy).
   * Admins receive every active employee instead, since admins may assign
   * tasks across the organisation.
   */
  async getDirectReports(userId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, userRole: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
      throw new ForbiddenException('Manager or admin access required');
    }

    return this.prisma.employee.findMany({
      where: {
        status: { not: 'Offboarded' },
        ...(employee.userRole === 'admin' ? {} : { managerId: employee.id }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        roleTitle: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

