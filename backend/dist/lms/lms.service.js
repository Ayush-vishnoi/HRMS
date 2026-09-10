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
exports.LmsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
let LmsService = class LmsService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId) {
        const [courses, enrollments] = await Promise.all([
            this.prisma.lmsCourse.findMany({ include: { modules: { orderBy: { orderIndex: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
            this.prisma.employeeCourseEnrollment.findMany({
                where: employeeId ? { employeeId } : {},
                include: { course: { include: { modules: true } } },
            }),
        ]);
        return { courses, enrollments };
    }
    async handleAction(body) {
        const { action } = body;
        if (action === 'enroll') {
            const enrolled = await this.prisma.employeeCourseEnrollment.upsert({
                where: { employeeId_courseId: { employeeId: body.employeeId, courseId: body.courseId } },
                update: { dueDate: body.dueDate || '2026-09-30' },
                create: { employeeId: body.employeeId, courseId: body.courseId, dueDate: body.dueDate || '2026-09-30', progressPercentage: 0, status: 'Enrolled' },
                include: { course: true },
            });
            await this.notify.notifyUser({
                userId: body.employeeId,
                title: 'Course enrollment confirmed',
                message: `You have been enrolled in "${enrolled.course.title}". Due date: ${enrolled.dueDate}.`,
                type: 'TaskAssignment',
                linkUrl: '/lms',
            });
            return enrolled;
        }
        if (action === 'progress') {
            const isCompleted = Number(body.progressPercentage) >= 100;
            const updated = await this.prisma.employeeCourseEnrollment.update({
                where: { employeeId_courseId: { employeeId: body.employeeId, courseId: body.courseId } },
                data: {
                    progressPercentage: Math.min(100, Number(body.progressPercentage)),
                    scorePercentage: body.scorePercentage ? Number(body.scorePercentage) : undefined,
                    status: isCompleted ? 'Completed' : 'InProgress',
                    completionDate: isCompleted ? new Date().toISOString().split('T')[0] : null,
                    certificateUrl: isCompleted ? `/certificates/cert-${body.courseId}-${body.employeeId}.pdf` : null,
                },
            });
            if (isCompleted) {
                const course = await this.prisma.lmsCourse.findUnique({
                    where: { id: body.courseId },
                    select: { title: true },
                });
                await this.notify.notifyUser({
                    userId: body.employeeId,
                    title: 'Course completed 🎓',
                    message: `Congratulations! You have completed "${course?.title ?? 'your course'}"${body.scorePercentage ? ` with a score of ${body.scorePercentage}%` : ''}. Your certificate is ready.`,
                    type: 'Celebration',
                    linkUrl: '/lms',
                });
            }
            return updated;
        }
        throw new Error('Invalid LMS action');
    }
};
exports.LmsService = LmsService;
exports.LmsService = LmsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], LmsService);
//# sourceMappingURL=lms.service.js.map