"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
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
let TasksService = class TasksService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    formatTask(task) {
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
    async findAll(userId, scope) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, userRole: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (scope === 'team') {
            if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Manager or admin access required');
            }
            const tasks = await this.prisma.task.findMany({
                where: employee.userRole === 'admin'
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
            const overdueCount = tasks.filter((task) => task.status !== client_1.TaskStatus.Done &&
                task.dueDate !== null &&
                task.dueDate.getTime() < Date.now()).length;
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
    async create(userId, body) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, name: true, userRole: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        const title = (body.title || '').trim();
        if (!title)
            throw new common_1.BadRequestException('Title is required');
        let assignedToId = typeof body.assignedToId === 'string' ? body.assignedToId.trim() : employee.id;
        const count = await this.prisma.task.count();
        const newId = `TSK-${String(count + 1).padStart(4, '0')}`;
        const created = await this.prisma.task.create({
            data: {
                id: newId,
                title,
                description: (body.description || '').trim(),
                dueDate: body.dueDate ? new Date(body.dueDate) : null,
                priority: (body.priority || 'Medium'),
                status: (body.status || 'Todo'),
                assignedToId,
                assignedById: employee.id,
            },
            include: taskInclude,
        });
        return this.formatTask(created);
    }
    async update(userId, body) {
        const id = body.id;
        if (!id)
            throw new common_1.BadRequestException('Task id is required');
        const existing = await this.prisma.task.findUnique({
            where: { id },
            select: { id: true, assignedToId: true, assignedById: true },
        });
        if (!existing)
            throw new common_1.NotFoundException('Task not found');
        const data = {};
        if (body.title)
            data.title = body.title.trim();
        if (body.description !== undefined)
            data.description = body.description.trim();
        if (body.priority)
            data.priority = body.priority;
        if (body.status) {
            data.status = body.status;
            if (body.status === 'Done')
                data.completedAt = new Date();
            else
                data.completedAt = null;
        }
        if (body.dueDate !== undefined)
            data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
        if (body.assignedToId)
            data.assignedToId = body.assignedToId;
        const updated = await this.prisma.task.update({
            where: { id },
            data,
            include: taskInclude,
        });
        return this.formatTask(updated);
    }
    async delete(userId, id) {
        await this.prisma.task.delete({ where: { id } });
        return { success: true, id };
    }
    async getDirectReports(userId) {
        const employee = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, userRole: true },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (employee.userRole !== 'manager' && employee.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Manager or admin access required');
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
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map