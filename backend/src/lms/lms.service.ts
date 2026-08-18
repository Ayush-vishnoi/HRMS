import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LmsService {
  constructor(private prisma: PrismaService) {}

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
      return this.prisma.employeeCourseEnrollment.upsert({
        where: { employeeId_courseId: { employeeId: body.employeeId, courseId: body.courseId } },
        update: { dueDate: body.dueDate || '2026-09-30' },
        create: { employeeId: body.employeeId, courseId: body.courseId, dueDate: body.dueDate || '2026-09-30', progressPercentage: 0, status: 'Enrolled' },
        include: { course: true },
      });
    }

    if (action === 'progress') {
      const isCompleted = Number(body.progressPercentage) >= 100;
      return this.prisma.employeeCourseEnrollment.update({
        where: { employeeId_courseId: { employeeId: body.employeeId, courseId: body.courseId } },
        data: {
          progressPercentage: Math.min(100, Number(body.progressPercentage)),
          scorePercentage: body.scorePercentage ? Number(body.scorePercentage) : undefined,
          status: isCompleted ? 'Completed' : 'InProgress',
          completionDate: isCompleted ? new Date().toISOString().split('T')[0] : null,
          certificateUrl: isCompleted ? `/certificates/cert-${body.courseId}-${body.employeeId}.pdf` : null,
        },
      });
    }

    throw new Error('Invalid LMS action');
  }
}
