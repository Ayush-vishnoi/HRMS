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
exports.PermissionsService = exports.CEO_PERMISSION_LABELS = exports.CEO_PERMISSIONS = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
exports.CEO_PERMISSIONS = [
    'ONBOARDING_APPROVAL',
    'IMMEDIATE_TERMINATION',
    'REQUISITION_APPROVAL',
    'PAYROLL_MANAGEMENT',
];
exports.CEO_PERMISSION_LABELS = {
    ONBOARDING_APPROVAL: 'Recruitment Approvals (offers & paid onboarding)',
    IMMEDIATE_TERMINATION: 'Immediate Termination',
    REQUISITION_APPROVAL: 'Requisition Budget Approval',
    PAYROLL_MANAGEMENT: 'Payroll Management (run & disburse cycles)',
};
let PermissionsService = class PermissionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRawRole(userId) {
        const emp = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { userRole: true },
        });
        return emp?.userRole ?? null;
    }
    activeDelegationWhere(delegateeId, permission) {
        return {
            delegateeId,
            permission,
            revokedAt: null,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        };
    }
    async hasCeoPermission(userId, permission) {
        const rawRole = await this.getRawRole(userId);
        if (rawRole === 'ceo') {
            return { allowed: true, viaDelegation: false };
        }
        if (rawRole === 'admin') {
            const grant = await this.prisma.delegatedPermission.findFirst({
                where: this.activeDelegationWhere(userId, permission),
                orderBy: { grantedAt: 'desc' },
                include: { delegator: { select: { id: true, name: true } } },
            });
            if (grant) {
                return {
                    allowed: true,
                    viaDelegation: true,
                    delegatorId: grant.delegator.id,
                    delegatorName: grant.delegator.name,
                };
            }
        }
        return { allowed: false, viaDelegation: false };
    }
    async assertCeoPermission(userId, permission) {
        const check = await this.hasCeoPermission(userId, permission);
        if (!check.allowed) {
            throw new common_1.ForbiddenException(`This action requires the ${exports.CEO_PERMISSION_LABELS[permission]} permission.`);
        }
        return check;
    }
    async getActiveDelegatorIds(delegateeId, permission) {
        const grants = await this.prisma.delegatedPermission.findMany({
            where: this.activeDelegationWhere(delegateeId, permission),
            select: { delegatorId: true },
        });
        return [...new Set(grants.map((g) => g.delegatorId))];
    }
    async getMyActiveDelegations(userId) {
        const grants = await this.prisma.delegatedPermission.findMany({
            where: {
                delegateeId: userId,
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            include: { delegator: { select: { id: true, name: true, roleTitle: true } } },
            orderBy: { grantedAt: 'desc' },
        });
        return grants.map((g) => ({
            id: g.id,
            permission: g.permission,
            label: exports.CEO_PERMISSION_LABELS[g.permission],
            delegatorId: g.delegator.id,
            delegatorName: g.delegator.name,
            expiresAt: g.expiresAt,
            grantedAt: g.grantedAt,
        }));
    }
    async listDelegations(ceoId) {
        await this.assertIsCeo(ceoId);
        const now = new Date();
        const grants = await this.prisma.delegatedPermission.findMany({
            where: { delegatorId: ceoId },
            include: { delegatee: { select: { id: true, name: true, roleTitle: true, email: true } } },
            orderBy: { grantedAt: 'desc' },
        });
        return grants.map((g) => ({
            id: g.id,
            permission: g.permission,
            label: exports.CEO_PERMISSION_LABELS[g.permission],
            delegateeId: g.delegatee.id,
            delegateeName: g.delegatee.name,
            delegateeRoleTitle: g.delegatee.roleTitle,
            note: g.note,
            grantedAt: g.grantedAt,
            expiresAt: g.expiresAt,
            revokedAt: g.revokedAt,
            active: !g.revokedAt && (!g.expiresAt || g.expiresAt > now),
        }));
    }
    async assertIsCeo(userId) {
        const rawRole = await this.getRawRole(userId);
        if (rawRole !== 'ceo') {
            throw new common_1.ForbiddenException('Only the CEO can manage delegations.');
        }
    }
    async createDelegation(ceoId, dto) {
        await this.assertIsCeo(ceoId);
        if (!exports.CEO_PERMISSIONS.includes(dto.permission)) {
            throw new common_1.BadRequestException('Unknown permission.');
        }
        const delegatee = await this.prisma.employee.findUnique({
            where: { id: dto.delegateeId },
            select: { id: true, userRole: true, name: true, status: true },
        });
        if (!delegatee)
            throw new common_1.NotFoundException('Delegatee not found.');
        if (delegatee.userRole !== 'admin') {
            throw new common_1.BadRequestException('Permissions can only be delegated to an HR Admin.');
        }
        if (delegatee.id === ceoId) {
            throw new common_1.BadRequestException('Cannot delegate to yourself.');
        }
        let expiresAt = null;
        if (dto.expiresAt) {
            const parsed = new Date(dto.expiresAt);
            if (Number.isNaN(parsed.getTime()))
                throw new common_1.BadRequestException('Invalid expiry date.');
            if (parsed <= new Date())
                throw new common_1.BadRequestException('Expiry must be in the future.');
            expiresAt = parsed;
        }
        await this.prisma.delegatedPermission.updateMany({
            where: this.activeDelegationWhere(dto.delegateeId, dto.permission),
            data: { revokedAt: new Date(), revokedById: ceoId },
        });
        return this.prisma.delegatedPermission.create({
            data: {
                permission: dto.permission,
                delegatorId: ceoId,
                delegateeId: dto.delegateeId,
                expiresAt,
                note: dto.note ?? null,
            },
        });
    }
    async revokeDelegation(ceoId, id) {
        await this.assertIsCeo(ceoId);
        const grant = await this.prisma.delegatedPermission.findUnique({ where: { id } });
        if (!grant || grant.delegatorId !== ceoId) {
            throw new common_1.NotFoundException('Delegation not found.');
        }
        if (grant.revokedAt)
            return grant;
        return this.prisma.delegatedPermission.update({
            where: { id },
            data: { revokedAt: new Date(), revokedById: ceoId },
        });
    }
};
exports.PermissionsService = PermissionsService;
exports.PermissionsService = PermissionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PermissionsService);
//# sourceMappingURL=permissions.service.js.map