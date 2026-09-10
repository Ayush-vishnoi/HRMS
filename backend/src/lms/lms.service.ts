import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';

@Injectable()
export class LmsService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

  async findAll(employeeId?: string) {
    const [courses, enrollments] = await Promise.all([
      this.prisma.lmsCourse.findMany({ include: { modules: { orderBy: { orderIndex: 'asc' } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.employeeCourseEnrollment.findMany({
        where: employeeId ? { employeeId } : {},
        include: { course: { include: { modules: true } } },
      }),
    ]);
    return { courses, enrollments };
  }

  async handleAction(body: any) {
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
}
