import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId: string, isAdmin: boolean, requestedEmployeeId?: string) {
    const targetId = requestedEmployeeId || employeeId;
    const whereClause = isAdmin && !requestedEmployeeId ? undefined : { employeeId: targetId };

    const [documents, requests] = await Promise.all([
      this.prisma.employeeDocument.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
      }),
      this.prisma.documentRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
      }),
    ]);

    return { documents, requests };
  }

  async uploadDocument(employeeId: string, data: any) {
    const count = await this.prisma.employeeDocument.count();
    return this.prisma.employeeDocument.create({
      data: {
        id: `DOC-${204 + count + 1}`,
        employeeId,
        name: data.name,
        type: data.type || 'Identity Proof',
        size: data.size || '1.0 MB',
        status: 'UnderReview',
        note: data.note || 'Uploaded by employee and queued for HR verification.',
        uploadedOn: data.uploadedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
      },
      include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
    });
  }

  async createRequest(employeeId: string, data: any) {
    const count = await this.prisma.documentRequest.count();
    return this.prisma.documentRequest.create({
      data: {
        id: `REQ-${87 + count + 1}`,
        employeeId,
        documentType: data.documentType,
        reason: data.reason,
        status: 'Pending',
        requestedOn: data.requestedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
      },
      include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
    });
  }
}
