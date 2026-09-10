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
exports.TalentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
let TalentService = class TalentService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(userId, userRole, employeeId) {
        const targetId = employeeId || userId;
        const [careerPaths, aspiration, benchmarks] = await Promise.all([
            this.prisma.career_paths.findMany({ where: { is_active: true }, orderBy: { level_order: 'asc' } }),
            this.prisma.career_aspirations.findUnique({ where: { employee_id: targetId } }),
            this.prisma.role_skill_benchmarks.findMany({ include: { skill: true } }),
        ]);
        let talentPools = null;
        let successionPlans = null;
        if (userRole === 'admin') {
            [talentPools, successionPlans] = await Promise.all([
                this.prisma.talent_pools.findMany({ include: { members: { include: { employee: { select: { id: true, name: true, employeeCode: true, department: true, roleTitle: true, avatarUrl: true } } } } } }),
                this.prisma.succession_plans.findMany({ include: { incumbent: { select: { id: true, name: true, employeeCode: true, roleTitle: true, department: true } }, emergencySuccessor: { select: { id: true, name: true, employeeCode: true, roleTitle: true } } } }),
            ]);
        }
        return { careerPaths, aspiration, benchmarks, talentPools, successionPlans };
    }
    async handleAction(userId, userRole, body) {
        const { action } = body;
        const org = await this.prisma.organizations.findFirst({ select: { id: true } });
        const orgId = org?.id || 'org_default';
        if (action === 'save_aspirations' || action === 'update_aspirations') {
            const empId = body.employeeId || userId;
            return this.prisma.career_aspirations.upsert({
                where: { employee_id: empId },
                update: { target_role: body.targetRole, target_department: body.targetDepartment || null, target_timeline: body.targetTimeline || '1-2 Years', skills_to_develop: body.skillsToDevelop || [], last_discussed_at: new Date(), updated_at: new Date() },
                create: { employee_id: empId, target_role: body.targetRole, target_department: body.targetDepartment || null, target_timeline: body.targetTimeline || '1-2 Years', skills_to_develop: body.skillsToDevelop || [], last_discussed_at: new Date() },
            });
        }
        if (action === 'create_talent_pool') {
            return this.prisma.talent_pools.create({ data: { organization_id: orgId, name: body.name, category: body.category || 'HighPotential', description: body.description, is_confidential: Boolean(body.isConfidential ?? true), created_by_id: userId } });
        }
        if (action === 'add_talent_pool_member') {
            const pool = await this.prisma.talent_pools.findUnique({
                where: { id: body.poolId },
                select: { name: true, is_confidential: true },
            });
            const member = await this.prisma.talent_pool_members.upsert({
                where: { pool_id_employee_id: { pool_id: body.poolId, employee_id: body.employeeId } },
                update: { notes: body.notes },
                create: { pool_id: body.poolId, employee_id: body.employeeId, added_by_id: userId, notes: body.notes || null },
            });
            if (pool && !pool.is_confidential) {
                await this.notify.notifyUser({
                    userId: body.employeeId,
                    title: 'Added to talent pool',
                    message: `You have been added to the "${pool.name}" talent pool.`,
                    type: 'Performance',
                    linkUrl: '/talent',
                });
            }
            return member;
        }
        if (action === 'save_succession_plan') {
            const existing = await this.prisma.succession_plans.findFirst({ where: { critical_role_title: body.criticalRoleTitle, department: body.department } });
            const data = { incumbent_employee_id: body.incumbentId || null, emergency_successor_id: body.emergencySuccessorId || null, successors_json: JSON.stringify(body.successors || []), risk_level: body.riskLevel || 'Medium', last_reviewed_at: new Date(), updated_at: new Date() };
            if (existing)
                return this.prisma.succession_plans.update({ where: { id: existing.id }, data });
            return this.prisma.succession_plans.create({ data: { organization_id: orgId, critical_role_title: body.criticalRoleTitle, department: body.department, ...data } });
        }
        throw new Error('Invalid talent action');
    }
};
exports.TalentService = TalentService;
exports.TalentService = TalentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], TalentService);
//# sourceMappingURL=talent.service.js.map