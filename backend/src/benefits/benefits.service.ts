import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BenefitsService {
  constructor(private prisma: PrismaService) {}

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
}
