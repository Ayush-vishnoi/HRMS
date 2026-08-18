import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const mapPolicyCategory = (cat: string): any => {
  const clean = (cat || '').toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('conduct')) return 'CodeOfConduct';
  if (clean.includes('leave') || clean.includes('attendance')) return 'LeaveAndAttendance';
  if (clean.includes('security') || clean.includes('information')) return 'InformationSecurity';
  if (clean.includes('safety')) return 'WorkplaceSafety';
  if (clean.includes('harass') || clean.includes('posh')) return 'AntiHarassment';
  if (clean.includes('remote')) return 'RemoteWork';
  return 'CodeOfConduct';
};

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId: string, isAdmin: boolean) {
    return this.prisma.companyPolicy.findMany({
      orderBy: { effectiveDate: 'desc' },
      include: {
        acknowledgements: isAdmin ? true : { where: { employeeId } },
      },
    });
  }

  async acknowledge(policyId: string, employeeId: string) {
    return this.prisma.policyAcknowledgement.upsert({
      where: { policyId_employeeId: { policyId, employeeId } },
      update: { acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
      create: { policyId, employeeId, acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
    });
  }

  async create(data: any, uploadedById: string) {
    const count = await this.prisma.companyPolicy.count();
    return this.prisma.companyPolicy.create({
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
  }
}
