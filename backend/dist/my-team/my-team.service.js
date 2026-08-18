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
exports.MyTeamService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MyTeamService = class MyTeamService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(userId, userRole, managerId) {
        const targetManagerId = userRole === 'admin' && managerId ? managerId : userId;
        const teams = await this.prisma.managedTeam.findMany({
            where: { managerId: targetManagerId },
            include: {
                manager: true, leader: true,
                members: { include: { employee: true } },
            },
        });
        const metadataList = await this.prisma.teamMemberMetadata.findMany({ where: { managerId: targetManagerId } });
        const metadataMap = new Map(metadataList.map((m) => [m.employeeId, m]));
        return teams.map((team) => {
            const mapRisk = (risk) => risk === 'AtRisk' ? 'At risk' : risk === 'NeedsAttention' ? 'Needs attention' : 'On track';
            const mapMember = (emp) => {
                const meta = metadataMap.get(emp.id);
                return {
                    employee: { id: emp.id, employeeCode: emp.employeeCode, name: emp.name, role: emp.roleTitle, department: emp.department, email: emp.email, phone: emp.phone || '', avatar: emp.avatarUrl || '', status: emp.status, joinDate: emp.joinDate, location: emp.location, salary: Number(emp.salary) },
                    metadata: { employeeId: emp.id, focus: meta?.focus || '', workload: meta?.workload ?? 70, goalProgress: meta?.goalProgress ?? 60, goalLabel: meta?.goalLabel || '', nextOneToOne: meta?.nextOneToOne || '', risk: meta ? mapRisk(meta.risk) : 'On track', notes: meta?.notes || '' },
                };
            };
            return { id: team.id, name: team.name, department: team.department, manager: team.manager.name, leaderId: team.leaderId, focus: team.focus, leader: mapMember(team.leader), members: team.members.map(({ employee }) => mapMember(employee)) };
        });
    }
    async updateMetadata(userId, userRole, body) {
        const managerId = userRole === 'admin' && body.managerId ? body.managerId : userId;
        const { employeeId, notes, risk, goalProgress, workload, nextOneToOne } = body;
        const mapRisk = (r) => {
            if (!r)
                return 'OnTrack';
            const s = r.toLowerCase().replace(/[^a-z]/g, '');
            if (s.includes('atrisk') || s === 'risk')
                return 'AtRisk';
            if (s.includes('attention'))
                return 'NeedsAttention';
            return 'OnTrack';
        };
        return this.prisma.teamMemberMetadata.upsert({
            where: { employeeId_managerId: { employeeId, managerId } },
            update: {
                ...(notes !== undefined ? { notes } : {}),
                ...(risk ? { risk: mapRisk(risk) } : {}),
                ...(goalProgress !== undefined ? { goalProgress: Number(goalProgress) } : {}),
                ...(workload !== undefined ? { workload: Number(workload) } : {}),
                ...(nextOneToOne ? { nextOneToOne } : {}),
            },
            create: { id: `TMM-${Date.now()}`, employeeId, managerId, focus: 'Team delivery', goalLabel: 'Quarterly priorities', workload: Number(workload) || 70, goalProgress: Number(goalProgress) || 60, nextOneToOne: nextOneToOne || 'TBD', risk: mapRisk(risk), notes: notes || '' },
        });
    }
};
exports.MyTeamService = MyTeamService;
exports.MyTeamService = MyTeamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MyTeamService);
//# sourceMappingURL=my-team.service.js.map