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
exports.HelpDeskService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const uuid_1 = require("uuid");
const CATEGORY_LABEL_TO_ENUM = {
    'Grievance / Complaint': 'GrievanceOrComplaint',
};
const CATEGORY_ENUM_TO_LABEL = {
    GrievanceOrComplaint: 'Grievance / Complaint',
};
const STATUS_LABEL_TO_ENUM = {
    'In Progress': 'InProgress',
};
const STATUS_ENUM_TO_LABEL = {
    InProgress: 'In Progress',
};
const categoryToEnum = (value) => (CATEGORY_LABEL_TO_ENUM[value] ?? value);
const statusToEnum = (value) => (STATUS_LABEL_TO_ENUM[value] ?? value);
const toApiTicket = (ticket) => ({
    ...ticket,
    category: CATEGORY_ENUM_TO_LABEL[ticket.category] ?? ticket.category,
    status: STATUS_ENUM_TO_LABEL[ticket.status] ?? ticket.status,
});
let HelpDeskService = class HelpDeskService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId, status, category) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (status)
            where.status = statusToEnum(status);
        if (category)
            where.category = categoryToEnum(category);
        const tickets = await this.prisma.helpDeskTicket.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } },
                resolvedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        return tickets.map(toApiTicket);
    }
    async create(employeeId, data) {
        const created = await this.prisma.helpDeskTicket.create({
            data: {
                id: (0, uuid_1.v4)(),
                employeeId,
                category: categoryToEnum(data.category),
                priority: data.priority ?? 'Medium',
                subject: data.subject,
                description: data.description,
                createdAt: new Date().toISOString(),
            },
        });
        const employee = await this.prisma.employee.findUnique({
            where: { id: employeeId },
            select: { name: true },
        });
        await this.notify.notifyAdmins({
            title: 'New help desk ticket',
            message: `${employee?.name ?? 'An employee'} raised a ${data.priority ?? 'Medium'} priority ticket: ${data.subject}.`,
            type: 'HelpDesk',
            linkUrl: '/help-desk',
        });
        return toApiTicket(created);
    }
    async update(id, data) {
        const ticket = await this.prisma.helpDeskTicket.findUnique({ where: { id } });
        const updateData = {};
        if (data.status)
            updateData.status = statusToEnum(data.status);
        if (typeof data.resolution === 'string' && data.resolution.trim())
            updateData.resolution = data.resolution;
        if (data.status === 'Resolved') {
            updateData.resolvedById = data.resolvedById;
            updateData.resolvedAt = new Date().toISOString();
        }
        const updated = await this.prisma.helpDeskTicket.update({ where: { id }, data: updateData });
        if (ticket && data.status) {
            await this.notify.notifyUser({
                userId: ticket.employeeId,
                title: data.status === 'Resolved' ? 'Help desk ticket resolved' : `Ticket ${String(data.status).toLowerCase()}`,
                message: data.status === 'Resolved'
                    ? `Your ticket "${ticket.subject}" has been resolved${typeof data.resolution === 'string' && data.resolution.trim() ? `: ${data.resolution}` : ''}.`
                    : `Your ticket "${ticket.subject}" is now ${data.status}.`,
                type: 'HelpDesk',
                linkUrl: '/help-desk',
            });
        }
        return toApiTicket(updated);
    }
};
exports.HelpDeskService = HelpDeskService;
exports.HelpDeskService = HelpDeskService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], HelpDeskService);
//# sourceMappingURL=help-desk.service.js.map