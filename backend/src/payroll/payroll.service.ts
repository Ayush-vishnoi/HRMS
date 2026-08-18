import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService) {}

  async getPayslips(employeeId?: string, monthYear?: string) {
    const where: any = {};
    if (employeeId) where.employeeId = employeeId;
    if (monthYear) where.monthYear = monthYear;
    return this.prisma.payslip.findMany({
      where,
      include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
      orderBy: { monthYear: 'desc' },
    });
  }

  async getCycles(status?: string) {
    return this.prisma.payrollCycle.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { monthYear: 'desc' },
    });
  }

  async getSalaryStructure(employeeId: string) {
    return this.prisma.salaryStructure.findUnique({ where: { employeeId } });
  }

  async getLoans(employeeId?: string) {
    return this.prisma.employeeLoanAdvance.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTaxDeclarations(employeeId: string) {
    return this.prisma.employeeTaxDeclaration.findMany({
      where: { employeeId },
      orderBy: { financialYear: 'desc' },
    });
  }
}
