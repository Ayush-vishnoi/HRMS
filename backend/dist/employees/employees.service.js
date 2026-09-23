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
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const audit_service_1 = require("../common/audit/audit.service");
const permissions_service_1 = require("../permissions/permissions.service");
const default_balances_1 = require("../leaves/default-balances");
let EmployeesService = class EmployeesService {
    prisma;
    notify;
    audit;
    permissions;
    constructor(prisma, notify, audit, permissions) {
        this.prisma = prisma;
        this.notify = notify;
        this.audit = audit;
        this.permissions = permissions;
    }
    async findAll(query) {
        const where = {};
        if (query.department)
            where.department = query.department;
        if (query.status)
            where.status = query.status;
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
                { employeeCode: { contains: query.search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.employee.findMany({
            where,
            select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                roleTitle: true,
                userRole: true,
                department: true,
                phone: true,
                avatarUrl: true,
                status: true,
                joinDate: true,
                location: true,
                managerId: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findOne(id) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                manager: {
                    select: { id: true, name: true, roleTitle: true, avatarUrl: true },
                },
                directReports: {
                    select: { id: true, name: true, roleTitle: true, avatarUrl: true },
                },
                leaveBalances: true,
                assignedAssets: true,
            },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return employee;
    }
    async create(data) {
        const count = await this.prisma.employee.count();
        const employeeCode = data.employeeCode || `EMP-${new Date().getUTCFullYear()}-${String(count + 1).padStart(3, '0')}`;
        const created = await this.prisma.employee.create({
            data: {
                id: data.id || undefined,
                employeeCode,
                name: data.name,
                email: data.email,
                roleTitle: data.role || data.roleTitle || 'Employee',
                userRole: data.userRole || 'employee',
                department: data.department || 'General',
                phone: data.phone || null,
                avatarUrl: data.avatar || data.avatarUrl || null,
                status: data.status || 'Active',
                joinDate: data.joinDate || new Date().toISOString().slice(0, 10),
                location: data.location || 'Bengaluru, Karnataka',
                salary: Number(data.salary) || 0,
                managerId: data.managerId || null,
            },
            select: {
                id: true,
                employeeCode: true,
                name: true,
                email: true,
                roleTitle: true,
                userRole: true,
                department: true,
                phone: true,
                avatarUrl: true,
                status: true,
                joinDate: true,
                location: true,
                salary: true,
                managerId: true,
            },
        });
        await this.prisma.leaveBalance.createMany({
            data: (0, default_balances_1.defaultLeaveBalanceRows)(created.id, new Date().getUTCFullYear()),
            skipDuplicates: true,
        });
        await this.notify.notifyUser({
            userId: created.id,
            title: 'Welcome to the team! 🎉',
            message: `Welcome aboard, ${created.name}! Your employee ID is ${created.employeeCode}. We are glad to have you join the ${created.department} department as ${created.roleTitle}.`,
            type: 'Onboarding',
            linkUrl: '/dashboard',
        });
        if (created.managerId) {
            await this.notify.notifyUser({
                userId: created.managerId,
                title: 'New team member',
                message: `${created.name} has joined as ${created.roleTitle} in ${created.department} and reports to you.`,
                type: 'Onboarding',
                linkUrl: '/employees',
            });
        }
        return created;
    }
    async update(id, data) {
        const employee = await this.prisma.employee.findUnique({ where: { id } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        return this.prisma.employee.update({ where: { id }, data });
    }
    async terminate(actorId, employeeId, body) {
        const check = await this.permissions.assertCeoPermission(actorId, 'IMMEDIATE_TERMINATION');
        const reason = (body?.reason ?? '').trim();
        if (!reason)
            throw new common_1.BadRequestException('A termination reason is required.');
        const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (employee.status === 'Terminated' || employee.status === 'Exited') {
            throw new common_1.BadRequestException(`${employee.name} is already ${employee.status.toLowerCase()}.`);
        }
        if ((employee.userRole ?? '') === 'ceo') {
            throw new common_1.BadRequestException('The CEO account cannot be terminated.');
        }
        if (employeeId === actorId) {
            throw new common_1.BadRequestException('You cannot terminate your own account.');
        }
        const typed = (body?.confirmationName ?? '').trim().toLowerCase();
        if (typed !== employee.name.trim().toLowerCase()) {
            throw new common_1.BadRequestException('Confirmation name does not match the employee name.');
        }
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const onBehalfOfId = check.viaDelegation ? check.delegatorId ?? null : null;
        await this.prisma.$transaction(async (tx) => {
            await tx.employee.update({
                where: { id: employeeId },
                data: { status: 'Terminated', lockedUntil: now },
            });
            const existingExit = await tx.exitRequest.findFirst({
                where: { employeeId, status: { not: 'Completed' } },
            });
            if (!existingExit) {
                await tx.exitRequest.create({
                    data: {
                        employeeId,
                        resignationDate: today,
                        requestedRelievingDate: today,
                        approvedRelievingDate: today,
                        reasonCategory: 'Terminated',
                        reasonDetails: reason,
                        managerApproval: 'Approved',
                        hrApproval: 'Approved',
                        managerApprovedAt: now,
                        hrApprovedAt: now,
                        noticePeriodDays: 0,
                        workflowStage: 'Exited',
                        status: 'Completed',
                    },
                });
            }
            const assets = await tx.asset.findMany({ where: { assignedToId: employeeId } });
            if (assets.length) {
                let seq = (await tx.assetRequest.count()) + 1;
                for (const asset of assets) {
                    let arId = `AR-${String(seq).padStart(3, '0')}`;
                    while (await tx.assetRequest.findUnique({ where: { id: arId } })) {
                        seq += 1;
                        arId = `AR-${String(seq).padStart(3, '0')}`;
                    }
                    await tx.assetRequest.create({
                        data: {
                            id: arId,
                            type: 'Return',
                            status: 'Pending',
                            requestedById: employeeId,
                            assetId: asset.id,
                            category: asset.category,
                            reason: `Asset recovery — immediate termination of ${employee.name}`,
                            updatedAt: now,
                        },
                    });
                    seq += 1;
                }
            }
            await tx.employeeOffboarding.upsert({
                where: { employeeId },
                create: { employeeId, reason, offboardedById: actorId, offboardedAt: now },
                update: { reason, offboardedById: actorId, offboardedAt: now },
            });
        });
        await this.audit.record({
            action: 'IMMEDIATE_TERMINATION',
            module: 'Employees',
            employeeId,
            actorId,
            onBehalfOfId,
            severity: 'high',
            details: {
                employeeName: employee.name,
                reason,
                viaDelegation: check.viaDelegation,
            },
        });
        await this.notify.notifyManagerOf(employeeId, {
            title: 'Employee terminated',
            message: `${employee.name} has been terminated with immediate effect. Reason: ${reason}`,
            type: 'Alert',
            linkUrl: `/employees/${employeeId}`,
        });
        await this.notify.notifyUser({
            userId: employeeId,
            title: 'Employment terminated',
            message: 'Your employment has been terminated with immediate effect. Please contact HR for the exit settlement.',
            type: 'Alert',
        });
        await this.notify.notifyDepartment('IT', {
            title: 'Asset recovery required',
            message: `${employee.name} has been terminated. Please recover assigned assets and revoke system access.`,
            type: 'Alert',
            linkUrl: '/assets',
        });
        return { success: true, status: 'Terminated', viaDelegation: check.viaDelegation };
    }
    async get360(id, access) {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: {
                manager: { select: { id: true, name: true, roleTitle: true, avatarUrl: true } },
                directReports: { select: { id: true, name: true, roleTitle: true, avatarUrl: true } },
            },
        });
        if (!employee)
            throw new common_1.NotFoundException('Employee not found');
        if (access && access.role !== 'admin' && access.currentUserId !== id && employee.managerId !== access.currentUserId) {
            throw new common_1.ForbiddenException('You do not have permission to view this employee profile');
        }
        const [attendanceSummary, leaveBalances, leaveRequests, payslips, kras, assignedAssets, documents, salaryStructure, skills, courseEnrollments, benefitEnrollments, exitRequest, salaryRevisions, disciplinaryWarnings, employmentProfile, changeRequests, recognitions, goals, kpis, reviewAssignments, competencyAssessments, pips, careerAspirations, feedback,] = await Promise.all([
            this.prisma.attendanceRecord.findMany({
                where: { employeeId: id },
                orderBy: { date: 'desc' },
                take: 30,
            }),
            this.prisma.leaveBalance.findMany({ where: { employeeId: id } }),
            this.prisma.leaveRequest.findMany({
                where: { employeeId: id },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.payslip.findMany({
                where: { employeeId: id },
                orderBy: { monthYear: 'desc' },
            }),
            this.prisma.performanceKra.findMany({
                where: { assignedToId: id },
                include: {
                    assignedTo: { select: { id: true, name: true } },
                    assignedBy: { select: { id: true, name: true } },
                },
            }),
            this.prisma.asset.findMany({ where: { assignedToId: id } }),
            this.prisma.employeeDocument.findMany({ where: { employeeId: id } }),
            this.prisma.salaryStructure.findFirst({ where: { employeeId: id, isActive: true } }),
            this.prisma.employeeSkill.findMany({
                where: { employeeId: id },
                include: { skill: true },
            }),
            this.prisma.employeeCourseEnrollment.findMany({
                where: { employeeId: id },
                include: { course: true },
            }),
            this.prisma.employeeBenefitEnrollment.findMany({
                where: { employeeId: id },
                include: { plan: true },
            }),
            this.prisma.exitRequest.findFirst({ where: { employeeId: id } }),
            this.prisma.salaryRevisionHistory.findMany({
                where: { employeeId: id },
                orderBy: { effectiveDate: 'desc' },
            }),
            this.prisma.employeeWarning.findMany({
                where: { employeeId: id },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.employee_employment_profiles.findFirst({ where: { employee_id: id } }),
            this.prisma.employee_change_requests.findMany({
                where: { employee_id: id },
                orderBy: { created_at: 'desc' },
            }),
            this.prisma.employeeRecognition.findMany({
                where: { receiverId: id },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.performanceGoal.findMany({
                where: { owner_employee_id: id },
            }),
            this.prisma.performance_kpis.findMany({ where: { employee_id: id } }),
            this.prisma.performance_review_assignments.findMany({
                where: { employee_id: id },
            }),
            this.prisma.performance_competency_assessments.findMany({
                where: { employee_id: id },
            }),
            this.prisma.performance_improvement_plans.findMany({
                where: { employee_id: id },
            }),
            this.prisma.career_aspirations.findFirst({ where: { employee_id: id } }),
            this.prisma.performance_feedback.findMany({
                where: { recipient_id: id },
                orderBy: { created_at: 'desc' },
            }),
        ]);
        return {
            employee,
            attendanceSummary,
            leaveBalances,
            leaveRequests,
            payslips,
            kras,
            assets: assignedAssets,
            documents,
            salaryStructure: salaryStructure ?? null,
            skills,
            courseEnrollments,
            benefitEnrollments,
            exitRequest: exitRequest ?? null,
            salaryRevisions,
            disciplinaryWarnings,
            employmentProfile: employmentProfile ?? null,
            changeRequests,
            recognitions,
            goals,
            kpis,
            reviewAssignments,
            competencyAssessments,
            pips,
            careerAspirations: careerAspirations ?? null,
            feedback,
        };
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService,
        audit_service_1.AuditService,
        permissions_service_1.PermissionsService])
], EmployeesService);
//# sourceMappingURL=employees.service.js.map