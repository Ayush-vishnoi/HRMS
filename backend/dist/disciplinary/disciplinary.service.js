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
exports.DisciplinaryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DisciplinaryService = class DisciplinaryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(user, employeeId) {
        let where = {};
        if (user.userRole === 'employee') {
            where = { employeeId: user.id, isEmployeeVisible: true };
        }
        else if (user.userRole === 'manager') {
            const team = await this.prisma.employee.findMany({ where: { managerId: user.id }, select: { id: true } });
            const ids = [user.id, ...team.map((t) => t.id)];
            where = employeeId && ids.includes(employeeId) ? { employeeId } : { employeeId: { in: ids } };
        }
        else if (employeeId) {
            where = { employeeId };
        }
        return this.prisma.employeeWarning.findMany({ where, orderBy: { createdAt: 'desc' } });
    }
    async create(user, body) {
        const { employeeId, type = 'Written', severity = 'Medium', reason, incidentDate, actionRequired, isEmployeeVisible = true } = body;
        const warning = await this.prisma.employeeWarning.create({
            data: {
                id: `WARN-${Date.now().toString(36)}`,
                employeeId,
                type,
                severity,
                reason,
                incidentDate: incidentDate || new Date().toISOString().split('T')[0],
                issuedById: user.id,
                issuedByName: user.userRole === 'admin' ? 'HR Operations' : 'Reporting Manager',
                actionRequired: actionRequired || 'Acknowledgment and adherence to company policies',
                isEmployeeVisible: Boolean(isEmployeeVisible),
                status: 'Active',
            },
        });
        await this.prisma.auditLog.create({
            data: { id: `audit-${Date.now()}`, action: 'CREATE', module: 'Disciplinary', employeeId, details: JSON.stringify({ type, severity, reason }) },
        });
        if (isEmployeeVisible) {
            await this.prisma.userNotification.create({
                data: {
                    id: `notif-${Date.now()}`,
                    userId: employeeId,
                    title: `Formal Notice: ${type} Warning Issued`,
                    message: `A disciplinary record has been logged. Action required: ${actionRequired}`,
                    type: 'Warning',
                    linkUrl: '/employee-lifecycle',
                },
            });
        }
        return warning;
    }
};
exports.DisciplinaryService = DisciplinaryService;
exports.DisciplinaryService = DisciplinaryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DisciplinaryService);
//# sourceMappingURL=disciplinary.service.js.map