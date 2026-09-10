import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';

@Injectable()
export class BenefitsService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

  async findAll(employeeId?: string) {
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

  async handleAction(body: any) {
    const { action } = body;

    if (action === 'enroll') {
      const created = await this.prisma.employeeBenefitEnrollment.create({
        data: {
          id: `ENR-${Date.now().toString(36)}`,
          employeeId: body.employeeId, benefitPlanId: body.benefitPlanId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          coverageStartDate: body.coverageStartDate || '2026-04-01',
          coverageEndDate: body.coverageEndDate || '2027-03-31', status: 'Active',
        },
        include: { plan: true },
      });
      await this.notify.notifyUser({
        userId: body.employeeId,
        title: 'Benefit enrollment confirmed',
        message: `You have been enrolled in "${created.plan.name}". Coverage: ${created.coverageStartDate} to ${created.coverageEndDate}.`,
        type: 'Success',
        linkUrl: '/benefits',
      });
      return created;
    }

    if (action === 'claim') {
      const created = await this.prisma.benefitClaim.create({
        data: {
          id: `CLM-${Date.now().toString(36)}`,
          enrollmentId: body.enrollmentId, employeeId: body.employeeId,
          claimType: body.claimType, claimAmount: Number(body.claimAmount),
          hospital: body.hospital, incidentDate: body.incidentDate, status: 'Submitted',
        },
      });
      const employee = await this.prisma.employee.findUnique({
        where: { id: body.employeeId },
        select: { name: true },
      });
      await this.notify.notifyAdmins({
        title: 'New benefit claim',
        message: `${employee?.name ?? 'An employee'} submitted a ${body.claimType} claim of ₹${Number(body.claimAmount).toFixed(2)}${body.hospital ? ` (${body.hospital})` : ''}.`,
        type: 'Document',
        linkUrl: '/benefits',
      });
      return created;
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
}
