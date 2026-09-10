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
exports.ExitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
const offer_documents_1 = require("../recruitment/offer-documents");
const EXIT_INCLUDE = { clearances: true, interview: true, settlement: true, ktTasks: true };
const INACTIVE_EXIT_STATUSES = ['Completed', 'Cancelled', 'Withdrawn', 'Rejected'];
const WITHDRAWABLE_STAGES = ['Pending Manager Approval', 'Pending HR Approval'];
const FF_ELIGIBLE_STAGES = ['In Notice Period', 'Clearance In Progress', 'Settled'];
const LETTER_ELIGIBLE_STAGES = ['Settled', 'Exited'];
const LETTER_ELIGIBLE_STATUSES = ['Settled', 'Completed'];
const EXIT_DEPARTMENTS = ['IT', 'Finance', 'HR', 'Manager', 'Admin'];
const POST_RELIEVING_ACCESS_DAYS = 30;
function fmtDateLong(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime()))
        return value;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}
function endOfDay(dateStr) {
    const d = new Date(`${dateStr}T23:59:59.999`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
}
let ExitService = class ExitService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async getExitRequestOrThrow(id) {
        if (!id)
            throw new common_1.BadRequestException('exitRequestId is required.');
        const req = await this.prisma.exitRequest.findUnique({ where: { id }, include: EXIT_INCLUDE });
        if (!req)
            throw new common_1.NotFoundException('Exit request not found.');
        return req;
    }
    listEmployeeInfo() {
        return this.prisma.employee.findMany({
            where: { status: { notIn: ['Exited', 'Offboarded'] } },
            select: {
                id: true,
                name: true,
                employeeCode: true,
                department: true,
                roleTitle: true,
                email: true,
                managerId: true,
                avatarUrl: true,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findAll(userId, userRole, employeeId) {
        if (employeeId) {
            const isPrivileged = userRole === 'admin' || userRole === 'manager';
            if (employeeId !== userId && !isPrivileged) {
                throw new common_1.ForbiddenException('You can only view your own separation records.');
            }
            const [exitRequests, alumniRecords, assignedAssets] = await Promise.all([
                this.prisma.exitRequest.findMany({
                    where: { employeeId },
                    include: EXIT_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.alumniRecord.findMany({
                    where: { employeeId },
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.asset.findMany({
                    where: { assignedToId: employeeId },
                    select: { id: true, assetTag: true, name: true, serialNumber: true, category: true, status: true },
                }),
            ]);
            return { exitRequests, alumniRecords, assignedAssets, employees: [] };
        }
        if (userRole === 'admin') {
            const [exitRequests, alumniRecords, employees] = await Promise.all([
                this.prisma.exitRequest.findMany({ include: EXIT_INCLUDE, orderBy: { createdAt: 'desc' } }),
                this.prisma.alumniRecord.findMany({ orderBy: { createdAt: 'desc' } }),
                this.listEmployeeInfo(),
            ]);
            return { exitRequests, alumniRecords, assignedAssets: [], employees };
        }
        if (userRole === 'manager') {
            const team = await this.prisma.employee.findMany({
                where: { managerId: userId },
                select: { id: true },
            });
            const visibleIds = [userId, ...team.map((t) => t.id)];
            const [exitRequests, alumniRecords, employees] = await Promise.all([
                this.prisma.exitRequest.findMany({
                    where: { employeeId: { in: visibleIds } },
                    include: EXIT_INCLUDE,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.alumniRecord.findMany({
                    where: { employeeId: { in: visibleIds } },
                    orderBy: { createdAt: 'desc' },
                }),
                this.listEmployeeInfo(),
            ]);
            return { exitRequests, alumniRecords, assignedAssets: [], employees };
        }
        const [exitRequests, alumniRecords, assignedAssets] = await Promise.all([
            this.prisma.exitRequest.findMany({
                where: { employeeId: userId },
                include: EXIT_INCLUDE,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.alumniRecord.findMany({
                where: { employeeId: userId },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.asset.findMany({
                where: { assignedToId: userId },
                select: { id: true, assetTag: true, name: true, serialNumber: true, category: true, status: true },
            }),
        ]);
        return { exitRequests, alumniRecords, assignedAssets, employees: [] };
    }
    async handleAction(user, body) {
        const { action } = body;
        if (action === 'submit_resignation') {
            const empId = body.employeeId || user.id;
            if (user.userRole !== 'admin' && empId !== user.id) {
                throw new common_1.ForbiddenException('You can only submit your own resignation.');
            }
            const existingActive = await this.prisma.exitRequest.findFirst({
                where: { employeeId: empId, status: { notIn: INACTIVE_EXIT_STATUSES } },
            });
            if (existingActive) {
                throw new common_1.BadRequestException('An active resignation request already exists. Only one active resignation is allowed per employee.');
            }
            const todayStr = new Date().toISOString().split('T')[0];
            const created = await this.prisma.exitRequest.create({
                data: {
                    id: `EXIT-${Date.now().toString(36)}`,
                    employeeId: empId,
                    resignationDate: todayStr,
                    requestedRelievingDate: body.requestedRelievingDate,
                    reasonCategory: body.reasonCategory,
                    reasonDetails: body.reasonDetails,
                    noticePeriodDays: Number(body.noticePeriodDays || 60),
                    workflowStage: 'Pending Manager Approval',
                    status: 'Submitted',
                    clearances: {
                        create: EXIT_DEPARTMENTS.map((dept) => ({
                            employeeId: empId,
                            department: dept,
                            status: 'Pending',
                        })),
                    },
                },
                include: EXIT_INCLUDE,
            });
            const employee = await this.prisma.employee.findUnique({
                where: { id: empId },
                select: { name: true },
            });
            const message = `${employee?.name ?? 'An employee'} has submitted their resignation (requested relieving date: ${body.requestedRelievingDate}).`;
            await this.notify.notifyManagerOf(empId, {
                title: 'Resignation submitted',
                message,
                type: 'Exit',
                linkUrl: '/exit',
            });
            await this.notify.notifyAdmins({
                title: 'Resignation submitted',
                message,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return created;
        }
        if (action === 'withdraw_resignation') {
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (user.userRole !== 'admin' && req.employeeId !== user.id) {
                throw new common_1.ForbiddenException('You can only withdraw your own resignation.');
            }
            if (!WITHDRAWABLE_STAGES.includes(req.workflowStage)) {
                throw new common_1.BadRequestException(`This resignation can no longer be withdrawn (current stage: ${req.workflowStage}).`);
            }
            const updated = await this.prisma.exitRequest.update({
                where: { id: req.id },
                data: { status: 'Withdrawn', workflowStage: 'Withdrawn' },
                include: EXIT_INCLUDE,
            });
            const employee = await this.prisma.employee.findUnique({
                where: { id: req.employeeId },
                select: { name: true },
            });
            const message = `${employee?.name ?? 'An employee'} has withdrawn their resignation (submitted ${req.resignationDate}).`;
            await this.notify.notifyManagerOf(req.employeeId, {
                title: 'Resignation withdrawn',
                message,
                type: 'Exit',
                linkUrl: '/exit',
            });
            await this.notify.notifyAdmins({
                title: 'Resignation withdrawn',
                message,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return updated;
        }
        if (action === 'manager_approve' || action === 'manager_reject') {
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            const employee = await this.prisma.employee.findUnique({
                where: { id: req.employeeId },
                select: { name: true, managerId: true },
            });
            const isEmpManager = user.userRole === 'manager' && employee?.managerId === user.id;
            if (user.userRole !== 'admin' && !isEmpManager) {
                throw new common_1.ForbiddenException('Only the reporting manager or an HR admin can perform this action.');
            }
            if (req.workflowStage !== 'Pending Manager Approval') {
                throw new common_1.BadRequestException(`Manager action is not allowed at the ${req.workflowStage} stage.`);
            }
            if (action === 'manager_approve') {
                const updated = await this.prisma.exitRequest.update({
                    where: { id: req.id },
                    data: {
                        managerApproval: 'Approved',
                        managerApprovedAt: new Date(),
                        workflowStage: 'Pending HR Approval',
                    },
                    include: EXIT_INCLUDE,
                });
                await this.notify.notifyUser({
                    userId: req.employeeId,
                    title: 'Resignation approved by manager',
                    message: `Your reporting manager has approved your resignation.${body.remarks ? ` Remarks: ${body.remarks}` : ''} It is now pending HR approval.`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                await this.notify.notifyAdmins({
                    title: 'HR approval required',
                    message: `The resignation of ${employee?.name ?? 'an employee'} is now pending HR approval.`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                return updated;
            }
            const reason = String(body.remarks || '').trim();
            if (!reason)
                throw new common_1.BadRequestException('A rejection reason is required.');
            const updated = await this.prisma.exitRequest.update({
                where: { id: req.id },
                data: {
                    managerApproval: 'Rejected',
                    rejectionReason: reason,
                    status: 'Rejected',
                    workflowStage: 'Rejected',
                },
                include: EXIT_INCLUDE,
            });
            await this.notify.notifyUser({
                userId: req.employeeId,
                title: 'Resignation rejected by manager',
                message: `Your reporting manager has rejected your resignation. Reason: ${reason}`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return updated;
        }
        if (action === 'hr_approve' || action === 'hr_reject') {
            if (user.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Only HR admins can perform HR approval actions.');
            }
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (req.workflowStage !== 'Pending HR Approval') {
                throw new common_1.BadRequestException(`HR action is not allowed at the ${req.workflowStage} stage.`);
            }
            if (action === 'hr_approve') {
                const relievingDate = body.approvedRelievingDate || req.requestedRelievingDate;
                const updated = await this.prisma.exitRequest.update({
                    where: { id: req.id },
                    data: {
                        hrApproval: 'Approved',
                        hrApprovedAt: new Date(),
                        approvedRelievingDate: relievingDate,
                        workflowStage: 'In Notice Period',
                    },
                    include: EXIT_INCLUDE,
                });
                const employee = await this.prisma.employee.findUnique({
                    where: { id: req.employeeId },
                    select: { name: true },
                });
                await this.notify.notifyUser({
                    userId: req.employeeId,
                    title: 'Resignation approved by HR',
                    message: `HR has approved your resignation. Your notice period is now in effect and your approved relieving date is ${fmtDateLong(relievingDate)}.${body.remarks ? ` Remarks: ${body.remarks}` : ''}`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                await this.notify.notifyManagerOf(req.employeeId, {
                    title: 'Notice period started',
                    message: `HR approved the resignation of ${employee?.name ?? 'your report'}. Relieving date: ${fmtDateLong(relievingDate)}.`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                return updated;
            }
            const reason = String(body.remarks || '').trim();
            if (!reason)
                throw new common_1.BadRequestException('A rejection reason is required.');
            const updated = await this.prisma.exitRequest.update({
                where: { id: req.id },
                data: {
                    hrApproval: 'Rejected',
                    rejectionReason: reason,
                    status: 'Rejected',
                    workflowStage: 'Rejected',
                },
                include: EXIT_INCLUDE,
            });
            await this.notify.notifyUser({
                userId: req.employeeId,
                title: 'Resignation rejected by HR',
                message: `HR has rejected your resignation. Reason: ${reason}`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return updated;
        }
        if (action === 'interview_submit') {
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (user.userRole !== 'admin' && req.employeeId !== user.id) {
                throw new common_1.ForbiddenException('You can only record the interview for your own separation.');
            }
            if (['Withdrawn', 'Rejected'].includes(req.status)) {
                throw new common_1.BadRequestException('Exit interviews cannot be recorded for inactive requests.');
            }
            const feedback = String(body.feedbackText || '').trim();
            if (!feedback)
                throw new common_1.BadRequestException('Interview feedback text is required.');
            const interviewData = {
                feedbackText: feedback,
                primaryReason: body.primaryReason || req.reasonCategory || 'Other',
                ratingCompany: Number(body.ratingCompany ?? 4),
                ratingManager: Number(body.ratingManager ?? 4),
                ratingCulture: Number(body.ratingCulture ?? 4),
                wouldRecommend: body.wouldRecommend !== false,
                conductedAt: new Date(),
            };
            const interview = await this.prisma.exitInterview.upsert({
                where: { exitRequestId: req.id },
                update: interviewData,
                create: { exitRequestId: req.id, employeeId: req.employeeId, ...interviewData },
            });
            if (user.userRole === 'admin') {
                await this.notify.notifyUser({
                    userId: req.employeeId,
                    title: 'Exit interview recorded',
                    message: 'HR has recorded your exit interview feedback.',
                    type: 'Exit',
                    linkUrl: '/exit',
                });
            }
            else {
                await this.notify.notifyAdmins({
                    title: 'Exit interview submitted',
                    message: 'An employee has submitted their exit interview feedback.',
                    type: 'Exit',
                    linkUrl: '/exit',
                });
            }
            return interview;
        }
        if (action === 'kt_task_create') {
            if (user.userRole !== 'admin' && user.userRole !== 'manager') {
                throw new common_1.ForbiddenException('Only HR admins or managers can create KT tasks.');
            }
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (['Withdrawn', 'Rejected'].includes(req.status)) {
                throw new common_1.BadRequestException('KT tasks cannot be created for inactive requests.');
            }
            if (!body.title || !body.recipientEmployeeId) {
                throw new common_1.BadRequestException('Task title and recipient are required.');
            }
            const task = await this.prisma.knowledgeTransferTask.create({
                data: {
                    exitRequestId: req.id,
                    title: String(body.title).trim(),
                    description: String(body.description || '').trim(),
                    recipientEmployeeId: body.recipientEmployeeId,
                    recipientName: body.recipientName || 'Designated Colleague',
                    dueDate: body.dueDate || new Date().toISOString().split('T')[0],
                },
            });
            await this.notify.notifyUser({
                userId: task.recipientEmployeeId,
                title: 'Knowledge transfer task assigned',
                message: `You have been assigned a KT handover task: "${task.title}" (due ${task.dueDate}).`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            await this.notify.notifyUser({
                userId: req.employeeId,
                title: 'KT task created',
                message: `A knowledge transfer task "${task.title}" was created for your handover.`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return task;
        }
        if (action === 'kt_task_update') {
            const task = await this.prisma.knowledgeTransferTask.findUnique({
                where: { id: body.taskId },
            });
            if (!task)
                throw new common_1.NotFoundException('KT task not found.');
            if (body.status === 'Completed') {
                if (user.id !== task.recipientEmployeeId && user.userRole !== 'admin') {
                    throw new common_1.ForbiddenException('Only the assigned recipient can mark this task completed.');
                }
                const updated = await this.prisma.knowledgeTransferTask.update({
                    where: { id: task.id },
                    data: { status: 'Completed', completedAt: new Date() },
                });
                await this.notify.notifyAdmins({
                    title: 'KT task completed',
                    message: `The KT task "${task.title}" was marked completed by the recipient. It can now be verified.`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                await this.notify.notifyUser({
                    userId: task.recipientEmployeeId,
                    title: 'KT task marked completed',
                    message: `You marked "${task.title}" as completed. Pending manager/HR verification.`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                return updated;
            }
            if (body.status === 'Verified') {
                if (user.userRole !== 'admin' && user.userRole !== 'manager') {
                    throw new common_1.ForbiddenException('Only HR admins or managers can verify KT tasks.');
                }
                const updated = await this.prisma.knowledgeTransferTask.update({
                    where: { id: task.id },
                    data: {
                        status: 'Verified',
                        verifiedById: user.id,
                        verifiedAt: new Date(),
                        notes: body.notes || undefined,
                    },
                });
                await this.notify.notifyUser({
                    userId: task.recipientEmployeeId,
                    title: 'KT task verified',
                    message: `Your handover task "${task.title}" has been verified. Thank you!`,
                    type: 'Exit',
                    linkUrl: '/exit',
                });
                return updated;
            }
            throw new common_1.BadRequestException('Invalid KT task status. Allowed values: Completed, Verified.');
        }
        if (action === 'clearance_update') {
            if (user.userRole !== 'admin' && user.userRole !== 'manager') {
                throw new common_1.ForbiddenException('Only HR admins or managers can update clearances.');
            }
            const clearance = await this.prisma.exitDepartmentClearance.findUnique({
                where: { id: body.clearanceId },
            });
            if (!clearance)
                throw new common_1.NotFoundException('Clearance record not found.');
            const updated = await this.prisma.exitDepartmentClearance.update({
                where: { id: clearance.id },
                data: {
                    status: body.status,
                    clearedById: user.id,
                    clearedAt: body.status === 'Cleared' ? new Date() : null,
                    remarks: body.remarks || undefined,
                    assetReturnedCount: body.assetReturnedCount !== undefined ? Number(body.assetReturnedCount) : undefined,
                    duesPendingAmount: body.duesPendingAmount !== undefined ? Number(body.duesPendingAmount) : undefined,
                },
            });
            if (body.status === 'Cleared') {
                const req = await this.prisma.exitRequest.findUnique({
                    where: { id: clearance.exitRequestId },
                    select: { workflowStage: true },
                });
                if (req?.workflowStage === 'In Notice Period') {
                    await this.prisma.exitRequest.update({
                        where: { id: clearance.exitRequestId },
                        data: { workflowStage: 'Clearance In Progress' },
                    });
                }
            }
            await this.notify.notifyUser({
                userId: updated.employeeId,
                title: `Clearance ${String(body.status).toLowerCase()}`,
                message: `Your ${updated.department} department clearance has been marked as ${body.status}.${body.remarks ? ` Remarks: ${body.remarks}` : ''}`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return updated;
        }
        if (action === 'calculate_ff') {
            if (user.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Only HR admins can calculate the full & final settlement.');
            }
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (!FF_ELIGIBLE_STAGES.includes(req.workflowStage)) {
                throw new common_1.BadRequestException(`F&F calculation is not allowed at the ${req.workflowStage} stage.`);
            }
            const totalEarnings = Number(body.basicPay) +
                Number(body.leaveEncashmentAmount || 0) +
                Number(body.gratuityAmount || 0) +
                Number(body.bonusPayable || 0);
            const totalDeductions = Number(body.pendingDuesDeduction || 0) + Number(body.taxDeduction || 0);
            const settlementData = {
                totalPayableDays: Number(body.totalPayableDays),
                basicPay: Number(body.basicPay),
                leaveEncashmentAmount: Number(body.leaveEncashmentAmount || 0),
                gratuityAmount: Number(body.gratuityAmount || 0),
                bonusPayable: Number(body.bonusPayable || 0),
                pendingDuesDeduction: Number(body.pendingDuesDeduction || 0),
                taxDeduction: Number(body.taxDeduction || 0),
                netSettlementAmount: totalEarnings - totalDeductions,
                status: 'Calculated',
            };
            const settlement = await this.prisma.fullAndFinalSettlement.upsert({
                where: { exitRequestId: req.id },
                update: settlementData,
                create: {
                    id: `FF-${Date.now().toString(36)}`,
                    exitRequestId: req.id,
                    employeeId: req.employeeId,
                    ...settlementData,
                },
            });
            await this.prisma.exitRequest.update({
                where: { id: req.id },
                data: { workflowStage: 'Settled' },
            });
            await this.notify.notifyUser({
                userId: req.employeeId,
                title: 'Full & final settlement calculated',
                message: `Your full & final settlement has been calculated. Net settlement amount: ₹${(totalEarnings - totalDeductions).toFixed(2)}.`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return settlement;
        }
        if (action === 'generate_letter') {
            if (user.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Only HR admins can generate official letters.');
            }
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            const letterEligible = LETTER_ELIGIBLE_STAGES.includes(req.workflowStage) ||
                LETTER_ELIGIBLE_STATUSES.includes(req.status);
            if (!letterEligible) {
                throw new common_1.BadRequestException(`Letters can only be generated once the settlement is complete (current stage: ${req.workflowStage}).`);
            }
            const letterType = body.letterType === 'Experience_Letter' ? 'Experience_Letter' : 'Relieving_Letter';
            const { dataUrl } = await this.issueLetter(req, letterType);
            const alumniData = letterType === 'Relieving_Letter' ? { relievingLetterUrl: dataUrl } : { experienceLetterUrl: dataUrl };
            await this.prisma.alumniRecord.updateMany({ where: { employeeId: req.employeeId }, data: alumniData });
            const label = letterType === 'Relieving_Letter' ? 'Relieving Letter' : 'Experience Letter';
            await this.notify.notifyUser({
                userId: req.employeeId,
                title: `${label} generated`,
                message: `Your official ${label.toLowerCase()} has been generated and added to your Documents.`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return { downloadUrl: dataUrl, letterType, fileName: `${letterType}.pdf` };
        }
        if (action === 'complete_exit') {
            if (user.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Only HR admins can complete an exit.');
            }
            const req = await this.getExitRequestOrThrow(body.exitRequestId);
            if (body.employeeId && body.employeeId !== req.employeeId) {
                throw new common_1.BadRequestException('Employee does not match this exit request.');
            }
            if (req.workflowStage !== 'Settled') {
                throw new common_1.BadRequestException(`Exit can only be completed from the Settled stage (current: ${req.workflowStage}).`);
            }
            const emp = await this.prisma.employee.findUnique({ where: { id: req.employeeId } });
            if (!emp)
                throw new common_1.NotFoundException('Employee not found.');
            const relievingDate = req.approvedRelievingDate || req.requestedRelievingDate;
            const lockUntil = endOfDay(relievingDate);
            const relieving = await this.issueLetter(req, 'Relieving_Letter', lockUntil);
            const experience = await this.issueLetter(req, 'Experience_Letter', lockUntil);
            const profile = await this.prisma.employee_personal_profiles.findUnique({
                where: { employee_id: emp.id },
                select: { personal_email: true },
            });
            await this.prisma.alumniRecord.upsert({
                where: { employeeId: emp.id },
                update: {
                    exitDate: relievingDate,
                    relievingLetterUrl: relieving.dataUrl,
                    experienceLetterUrl: experience.dataUrl,
                },
                create: {
                    employeeId: emp.id,
                    employeeCode: emp.employeeCode,
                    name: emp.name,
                    personalEmail: profile?.personal_email || emp.email,
                    phone: emp.phone,
                    department: emp.department,
                    lastDesignation: emp.roleTitle,
                    joinDate: emp.joinDate,
                    exitDate: relievingDate,
                    relievingLetterUrl: relieving.dataUrl,
                    experienceLetterUrl: experience.dataUrl,
                },
            });
            const accessRevokedAt = new Date(lockUntil);
            accessRevokedAt.setDate(accessRevokedAt.getDate() + POST_RELIEVING_ACCESS_DAYS);
            await this.prisma.employee.update({
                where: { id: emp.id },
                data: { status: 'Exited', lockedUntil: accessRevokedAt },
            });
            const updated = await this.prisma.exitRequest.update({
                where: { id: req.id },
                data: { status: 'Completed', workflowStage: 'Exited' },
                include: EXIT_INCLUDE,
            });
            await this.notify.notifyUser({
                userId: emp.id,
                title: 'Exit completed',
                message: `Your separation has been completed. Your Relieving & Experience letters were added to your Documents (locked until ${fmtDateLong(relievingDate)}). Account access ends on ${fmtDateLong(accessRevokedAt.toISOString().split('T')[0])}. Your profile has been archived to the Alumni Directory.`,
                type: 'Exit',
                linkUrl: '/exit',
            });
            return updated;
        }
        throw new common_1.BadRequestException('Invalid exit action');
    }
    async issueLetter(exitRequest, letterType, lockedUntil) {
        const emp = await this.prisma.employee.findUnique({ where: { id: exitRequest.employeeId } });
        if (!emp)
            throw new common_1.NotFoundException('Employee not found.');
        const pdf = (0, offer_documents_1.generatePdf)(this.buildLetterLines(letterType, emp, exitRequest));
        const dataUrl = `data:application/pdf;base64,${pdf.toString('base64')}`;
        const label = letterType === 'Relieving_Letter' ? 'Relieving Letter' : 'Experience Letter';
        const docData = {
            name: label,
            type: letterType,
            fileUrl: dataUrl,
            size: `${Math.max(1, Math.round(pdf.length / 1024))} KB`,
            status: 'Verified',
            note: 'Official exit letter generated by HR Operations.',
            uploadedOn: new Date().toISOString().split('T')[0],
            mime_type: 'application/pdf',
            size_bytes: pdf.length,
            locked_until: lockedUntil ?? null,
            shared_by_hr: true,
            shared_at: new Date(),
        };
        const existing = await this.prisma.employeeDocument.findFirst({
            where: { employeeId: emp.id, type: letterType },
            orderBy: { createdAt: 'desc' },
        });
        const doc = existing
            ? await this.prisma.employeeDocument.update({ where: { id: existing.id }, data: docData })
            : await this.prisma.employeeDocument.create({
                data: {
                    id: `DOC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
                    employeeId: emp.id,
                    ...docData,
                },
            });
        return { dataUrl, documentId: doc.id };
    }
    buildLetterLines(letterType, emp, exitRequest) {
        const relievingDate = exitRequest.approvedRelievingDate || exitRequest.requestedRelievingDate;
        const firstName = emp.name.split(' ')[0];
        const today = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
        const header = [
            { text: 'MYLOTIC GROUP', bold: true, size: 16 },
            { text: 'Human Resources Department', size: 10 },
            { text: '' },
            { text: `Date: ${today}`, size: 10 },
            { text: '' },
            { text: `Employee ID: ${emp.employeeCode}`, size: 10 },
            { text: `Name: ${emp.name}`, size: 10 },
            { text: `Designation: ${emp.roleTitle}`, size: 10 },
            { text: `Department: ${emp.department}`, size: 10 },
            { text: '' },
        ];
        if (letterType === 'Relieving_Letter') {
            return [
                ...header,
                { text: 'RELIEVING LETTER', bold: true, size: 12 },
                { text: '' },
                { text: `Dear ${emp.name},`, size: 10 },
                { text: '' },
                {
                    text: `This is to formally confirm that your resignation from the position of ${emp.roleTitle} in the ${emp.department} department has been accepted, and you are hereby relieved from your duties with effect from ${fmtDateLong(relievingDate)}.`,
                    size: 10,
                },
                { text: '' },
                {
                    text: `You joined MYLOTIC GROUP on ${fmtDateLong(emp.joinDate)} and served the organization until ${fmtDateLong(relievingDate)}. During your tenure, we found you to be sincere, professional and dedicated towards your responsibilities.`,
                    size: 10,
                },
                { text: '' },
                {
                    text: 'All company assets in your possession have been returned and your full & final settlement has been processed in accordance with company policy.',
                    size: 10,
                },
                { text: '' },
                { text: 'We wish you the very best in your future endeavors.', size: 10 },
                { text: '' },
                { text: '' },
                { text: 'Sincerely,', size: 10 },
                { text: 'HR Operations', bold: true, size: 10 },
                { text: 'MYLOTIC GROUP', size: 10 },
            ];
        }
        return [
            ...header,
            { text: 'EXPERIENCE LETTER', bold: true, size: 12 },
            { text: '' },
            { text: 'TO WHOMSOEVER IT MAY CONCERN', bold: true, size: 10 },
            { text: '' },
            {
                text: `This is to certify that ${emp.name} (Employee ID: ${emp.employeeCode}) was employed with MYLOTIC GROUP as ${emp.roleTitle} in the ${emp.department} department from ${fmtDateLong(emp.joinDate)} to ${fmtDateLong(relievingDate)}.`,
                size: 10,
            },
            { text: '' },
            {
                text: `During the tenure with the organization, ${firstName} discharged all assigned responsibilities with professionalism, commitment and a consistent standard of performance. The conduct and character during the period of employment were found satisfactory.`,
                size: 10,
            },
            { text: '' },
            {
                text: `${firstName} stands relieved from the services of the organization with effect from ${fmtDateLong(relievingDate)}. This letter is issued upon request for future reference.`,
                size: 10,
            },
            { text: '' },
            { text: `We wish ${firstName} continued success in all future endeavors.`, size: 10 },
            { text: '' },
            { text: '' },
            { text: 'Sincerely,', size: 10 },
            { text: 'HR Operations', bold: true, size: 10 },
            { text: 'MYLOTIC GROUP', size: 10 },
        ];
    }
};
exports.ExitService = ExitService;
exports.ExitService = ExitService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], ExitService);
//# sourceMappingURL=exit.service.js.map