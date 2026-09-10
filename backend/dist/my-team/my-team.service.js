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
const notify_service_1 = require("../common/notifications/notify.service");
let MyTeamService = class MyTeamService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
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
        const metadataMap = await this.loadMetadata(targetManagerId);
        return teams.map((team) => this.formatTeam(team, metadataMap));
    }
    async createTeam(user, body) {
        const { name, department, leaderId, memberIds = [], focus, managerId } = body ?? {};
        if (!name || !leaderId) {
            throw new common_1.BadRequestException('Team name and leader are required.');
        }
        const targetManagerId = user.userRole === 'admin' && managerId ? managerId : user.id;
        const teamDepartment = department || 'Engineering';
        const leaderConflict = await this.prisma.managedTeam.findFirst({
            where: { leaderId, department: teamDepartment },
            include: { leader: true },
        });
        if (leaderConflict) {
            this.throwDepartmentConflict(leaderConflict.leader?.name || 'Selected employee', leaderConflict.name, teamDepartment, `${leaderConflict.leader?.name || 'Selected employee'} is already the Team Leader of "${leaderConflict.name}" in the ${teamDepartment} department.`);
        }
        await this.assertMembersAvailableForDepartment(memberIds, teamDepartment);
        const team = await this.prisma.managedTeam.create({
            data: {
                id: `team-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                name,
                department: teamDepartment,
                managerId: targetManagerId,
                leaderId,
                focus: focus || `${name} delivery and goals`,
                members: {
                    create: memberIds
                        .filter((id) => id !== leaderId)
                        .map((employeeId) => ({ employeeId })),
                },
            },
            include: {
                manager: true, leader: true,
                members: { include: { employee: true } },
            },
        });
        await this.notify.notifyUser({
            userId: leaderId,
            title: 'You are now a Team Leader',
            message: `You have been made the leader of team "${team.name}" (${team.department}).`,
            type: 'Meeting',
            linkUrl: '/my-team',
        });
        const memberIdsToNotify = memberIds.filter((id) => id !== leaderId);
        if (memberIdsToNotify.length > 0) {
            await this.notify.notifyUsers(memberIdsToNotify, {
                title: 'You have been added to a team',
                message: `You have been added as a member of team "${team.name}" (${team.department}).`,
                type: 'Meeting',
                linkUrl: '/my-team',
            });
        }
        return this.formatTeam(team, new Map());
    }
    async deleteTeam(user, teamId) {
        if (!teamId) {
            throw new common_1.BadRequestException('teamId query parameter is required.');
        }
        const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
        if (!team)
            throw new common_1.NotFoundException('Team not found.');
        if (user.userRole !== 'admin' && team.managerId !== user.id) {
            throw new common_1.ForbiddenException('You can only delete teams you manage.');
        }
        await this.prisma.managedTeam.delete({ where: { id: teamId } });
        return { id: teamId, name: team.name, deleted: true };
    }
    async handleAction(user, body) {
        const action = body?.action || 'UPDATE_METADATA';
        switch (action) {
            case 'UPDATE_LEADER':
                return this.updateLeader(user, body);
            case 'ADD_MEMBERS':
                return this.addMembers(user, body);
            case 'REMOVE_MEMBER':
                return this.removeMember(user, body);
            case 'UPDATE_METADATA':
                return this.updateMetadata(user.id, user.userRole, body);
            default:
                throw new common_1.BadRequestException(`Unsupported action "${action}".`);
        }
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
    async updateLeader(user, body) {
        const { teamId, leaderId } = body ?? {};
        if (!teamId || !leaderId) {
            throw new common_1.BadRequestException('teamId and leaderId are required.');
        }
        const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
        if (!team)
            throw new common_1.NotFoundException('Team not found.');
        this.assertCanManage(user, team.managerId);
        const conflict = await this.prisma.managedTeam.findFirst({
            where: { leaderId, department: team.department, id: { not: teamId } },
            include: { leader: true },
        });
        if (conflict) {
            this.throwDepartmentConflict(conflict.leader?.name || 'Selected employee', conflict.name, team.department, `${conflict.leader?.name || 'Selected employee'} is already the Team Leader of "${conflict.name}" in the ${team.department} department.`);
        }
        const updated = await this.prisma.managedTeam.update({
            where: { id: teamId },
            data: { leaderId },
            include: {
                manager: true, leader: true,
                members: { include: { employee: true } },
            },
        });
        if (team.leaderId !== leaderId) {
            await this.notify.notifyUser({
                userId: leaderId,
                title: 'You are now a Team Leader',
                message: `You have been made the leader of team "${updated.name}" (${updated.department}).`,
                type: 'Meeting',
                linkUrl: '/my-team',
            });
        }
        return this.formatTeam(updated, await this.loadMetadata(updated.managerId));
    }
    async addMembers(user, body) {
        const { teamId, employeeIds = [] } = body ?? {};
        if (!teamId || !Array.isArray(employeeIds) || employeeIds.length === 0) {
            throw new common_1.BadRequestException('teamId and a non-empty employeeIds array are required.');
        }
        const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
        if (!team)
            throw new common_1.NotFoundException('Team not found.');
        this.assertCanManage(user, team.managerId);
        await this.assertMembersAvailableForDepartment(employeeIds, team.department);
        const created = await this.prisma.teamMember.createMany({
            data: employeeIds.map((employeeId) => ({ teamId, employeeId })),
            skipDuplicates: true,
        });
        const updated = await this.prisma.managedTeam.findUnique({
            where: { id: teamId },
            include: {
                manager: true, leader: true,
                members: { include: { employee: true } },
            },
        });
        if (!updated)
            throw new common_1.NotFoundException('Team not found.');
        if (created.count > 0) {
            await this.notify.notifyUsers(employeeIds, {
                title: 'You have been added to a team',
                message: `You have been added as a member of team "${updated.name}" (${updated.department}).`,
                type: 'Meeting',
                linkUrl: '/my-team',
            });
        }
        return {
            success: true,
            data: this.formatTeam(updated, await this.loadMetadata(updated.managerId)),
            addedCount: created.count,
        };
    }
    async removeMember(user, body) {
        const { teamId, employeeId } = body ?? {};
        if (!teamId || !employeeId) {
            throw new common_1.BadRequestException('teamId and employeeId are required.');
        }
        const team = await this.prisma.managedTeam.findUnique({ where: { id: teamId } });
        if (!team)
            throw new common_1.NotFoundException('Team not found.');
        this.assertCanManage(user, team.managerId);
        await this.prisma.teamMember.deleteMany({ where: { teamId, employeeId } });
        const updated = await this.prisma.managedTeam.findUnique({
            where: { id: teamId },
            include: {
                manager: true, leader: true,
                members: { include: { employee: true } },
            },
        });
        if (!updated)
            throw new common_1.NotFoundException('Team not found.');
        await this.notify.notifyUser({
            userId: employeeId,
            title: 'Removed from team',
            message: `You have been removed from team "${team.name}" (${team.department}).`,
            type: 'Meeting',
            linkUrl: '/my-team',
        });
        return this.formatTeam(updated, await this.loadMetadata(updated.managerId));
    }
    async assertMembersAvailableForDepartment(employeeIds, department) {
        if (!employeeIds || employeeIds.length === 0)
            return;
        const memberships = await this.prisma.teamMember.findMany({
            where: { employeeId: { in: employeeIds } },
            include: { team: true, employee: true },
        });
        const conflictingMembership = memberships.find((m) => m.team.department === department);
        if (conflictingMembership) {
            this.throwDepartmentConflict(conflictingMembership.employee?.name || 'Selected employee', conflictingMembership.team.name, department, `${conflictingMembership.employee?.name || 'Selected employee'} is already a member of "${conflictingMembership.team.name}" in the ${department} department.`);
        }
        const leadingTeams = await this.prisma.managedTeam.findMany({
            where: { leaderId: { in: employeeIds }, department },
            include: { leader: true },
        });
        if (leadingTeams.length > 0) {
            const leading = leadingTeams[0];
            this.throwDepartmentConflict(leading.leader?.name || 'Selected employee', leading.name, department, `${leading.leader?.name || 'Selected employee'} is already the Team Leader of "${leading.name}" in the ${department} department.`);
        }
    }
    assertCanManage(user, teamManagerId) {
        if (user.userRole !== 'admin' && teamManagerId !== user.id) {
            throw new common_1.ForbiddenException('You can only modify teams you manage.');
        }
    }
    throwDepartmentConflict(employeeName, existingTeamName, department, message) {
        throw new common_1.HttpException({
            statusCode: common_1.HttpStatus.CONFLICT,
            code: 'DEPARTMENT_ASSIGNMENT_CONFLICT',
            message,
            conflict: { employeeName, existingTeamName, department },
        }, common_1.HttpStatus.CONFLICT);
    }
    async loadMetadata(managerId) {
        const metadataList = await this.prisma.teamMemberMetadata.findMany({
            where: { managerId },
        });
        return new Map(metadataList.map((m) => [m.employeeId, m]));
    }
    formatTeam(team, metadataMap) {
        const mapRisk = (risk) => risk === 'AtRisk' ? 'At risk' : risk === 'NeedsAttention' ? 'Needs attention' : 'On track';
        const mapMember = (emp) => {
            const meta = metadataMap.get(emp.id);
            return {
                employee: {
                    id: emp.id,
                    employeeCode: emp.employeeCode,
                    name: emp.name,
                    role: emp.roleTitle,
                    department: emp.department,
                    email: emp.email,
                    phone: emp.phone || '',
                    avatar: emp.avatarUrl || '',
                    status: emp.status,
                    joinDate: emp.joinDate,
                    location: emp.location,
                    salary: Number(emp.salary),
                },
                metadata: {
                    employeeId: emp.id,
                    focus: meta?.focus || '',
                    workload: meta?.workload ?? 70,
                    goalProgress: meta?.goalProgress ?? 60,
                    goalLabel: meta?.goalLabel || '',
                    nextOneToOne: meta?.nextOneToOne || '',
                    risk: meta ? mapRisk(meta.risk) : 'On track',
                    notes: meta?.notes || '',
                },
            };
        };
        return {
            id: team.id,
            name: team.name,
            department: team.department,
            manager: team.manager.name,
            leaderId: team.leaderId,
            focus: team.focus,
            leader: mapMember(team.leader),
            members: team.members.map(({ employee }) => mapMember(employee)),
        };
    }
};
exports.MyTeamService = MyTeamService;
exports.MyTeamService = MyTeamService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], MyTeamService);
//# sourceMappingURL=my-team.service.js.map