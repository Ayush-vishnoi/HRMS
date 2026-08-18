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
exports.BenefitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BenefitsService = class BenefitsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId) {
        const [plans, enrollments, claims] = await Promise.all([
            this.prisma.benefitPlan.findMany({ where: { isActive: true } }),
            this.prisma.employeeBenefitEnrollment.findMany({
                where: employeeId ? { employeeId } : {},
                include: { plan: true, dependents: true, claims: true },
            }),
            this.prisma.benefitClaim.findMany({ where: employeeId ? { employeeId } : {}, orderBy: { createdAt: 'desc' } }),
        ]);
        return { plans, enrollments, claims };
    }
    async handleAction(body) {
        const { action } = body;
        if (action === 'enroll') {
            return this.prisma.employeeBenefitEnrollment.create({
                data: {
                    id: `ENR-${Date.now().toString(36)}`,
                    employeeId: body.employeeId, benefitPlanId: body.benefitPlanId,
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    coverageStartDate: body.coverageStartDate || '2026-04-01',
                    coverageEndDate: body.coverageEndDate || '2027-03-31', status: 'Active',
                },
                include: { plan: true },
            });
        }
        if (action === 'claim') {
            return this.prisma.benefitClaim.create({
                data: {
                    id: `CLM-${Date.now().toString(36)}`,
                    enrollmentId: body.enrollmentId, employeeId: body.employeeId,
                    claimType: body.claimType, claimAmount: Number(body.claimAmount),
                    hospital: body.hospital, incidentDate: body.incidentDate, status: 'Submitted',
                },
            });
        }
        if (action === 'dependent') {
            return this.prisma.benefitDependent.create({
                data: {
                    id: `DEP-${Date.now().toString(36)}`,
                    enrollmentId: body.enrollmentId, name: body.name,
                    relationship: body.relationship || 'Spouse', dateOfBirth: body.dateOfBirth, gender: body.gender,
                },
            });
        }
        throw new Error('Invalid action');
    }
};
exports.BenefitsService = BenefitsService;
exports.BenefitsService = BenefitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BenefitsService);
//# sourceMappingURL=benefits.service.js.map