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
exports.WorkforceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WorkforceService = class WorkforceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId) {
        const where = employeeId ? { employee_id: employeeId } : {};
        const [timesheets, attendance, projects] = await Promise.all([
            this.prisma.timesheets.findMany({ where, orderBy: { work_date: 'desc' }, take: 30 }),
            this.prisma.attendanceRecord.findMany({
                where: employeeId ? { employeeId } : {},
                orderBy: { date: 'desc' },
                take: 30,
            }),
            this.prisma.workforce_projects.findMany({ where: { is_active: true } }),
        ]);
        return { timesheets, attendance, projects };
    }
    async logTime(body) {
        const { employeeId, date, description, loggedMinutes = 480, billableMinutes = 480, projectId } = body;
        return this.prisma.timesheets.create({
            data: {
                id: `TS-${Date.now().toString(36)}`,
                employee_id: employeeId,
                work_date: date ? new Date(date) : new Date(),
                logged_minutes: Number(loggedMinutes),
                billable_minutes: Number(billableMinutes),
                description: description || 'General feature development',
                project_id: projectId || null,
                status: 'Approved',
                created_at: new Date(),
                updated_at: new Date(),
            },
        });
    }
};
exports.WorkforceService = WorkforceService;
exports.WorkforceService = WorkforceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkforceService);
//# sourceMappingURL=workforce.service.js.map