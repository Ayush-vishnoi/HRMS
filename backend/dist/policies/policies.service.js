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
exports.PoliciesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const mapPolicyCategory = (cat) => {
    const clean = (cat || '').toLowerCase().replace(/[^a-z]/g, '');
    if (clean.includes('conduct'))
        return 'CodeOfConduct';
    if (clean.includes('leave') || clean.includes('attendance'))
        return 'LeaveAndAttendance';
    if (clean.includes('security') || clean.includes('information'))
        return 'InformationSecurity';
    if (clean.includes('safety'))
        return 'WorkplaceSafety';
    if (clean.includes('harass') || clean.includes('posh'))
        return 'AntiHarassment';
    if (clean.includes('remote'))
        return 'RemoteWork';
    return 'CodeOfConduct';
};
let PoliciesService = class PoliciesService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId, isAdmin) {
        return this.prisma.companyPolicy.findMany({
            orderBy: { effectiveDate: 'desc' },
            include: {
                acknowledgements: isAdmin ? true : { where: { employeeId } },
            },
        });
    }
    async acknowledge(policyId, employeeId) {
        return this.prisma.policyAcknowledgement.upsert({
            where: { policyId_employeeId: { policyId, employeeId } },
            update: { acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            create: { policyId, employeeId, acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
        });
    }
    async create(data, uploadedById) {
        const count = await this.prisma.companyPolicy.count();
        const created = await this.prisma.companyPolicy.create({
            data: {
                id: data.id || `POL-${String(count + 1).padStart(3, '0')}`,
                title: data.title,
                summary: data.summary,
                category: mapPolicyCategory(data.category),
                version: data.version || 'v1.0',
                effectiveDate: data.effectiveDate,
                updatedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                uploadedById,
                mandatory: data.mandatory ?? true,
                acknowledgementRequired: data.acknowledgementRequired ?? true,
                fileName: data.fileName || 'policy-document.pdf',
                fileSize: data.fileSize || '1.0 MB',
            },
        });
        const employees = await this.prisma.employee.findMany({
            where: { status: { in: ['Active', 'OnLeave', 'Remote'] } },
            select: { id: true },
        });
        await this.notify.notifyUsers(employees.map((e) => e.id), {
            title: 'New company policy published',
            message: `A new policy "${created.title}" (${created.version}) is now effective from ${created.effectiveDate}.${created.acknowledgementRequired ? ' Please review and acknowledge it.' : ''}`,
            type: 'Policy',
            linkUrl: '/policies',
        });
        return created;
    }
};
exports.PoliciesService = PoliciesService;
exports.PoliciesService = PoliciesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], PoliciesService);
//# sourceMappingURL=policies.service.js.map