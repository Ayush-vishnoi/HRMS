import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, userRole: string, view: string, employeeId?: string) {
    if (view === 'all' && userRole === 'admin') {
      return this.prisma.expenseClaim.findMany({ orderBy: { createdAt: 'desc' } });
    }
    if (view === 'all' && userRole === 'manager') {
      const reports = await this.prisma.employee.findMany({ where: { managerId: userId }, select: { id: true } });
      const ids = [userId, ...reports.map((r) => r.id)];
      return this.prisma.expenseClaim.findMany({ where: { employeeId: { in: ids } }, orderBy: { createdAt: 'desc' } });
    }
    return this.prisma.expenseClaim.findMany({ where: { employeeId: employeeId || userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(employeeId: string, data: any) {
    const count = await this.prisma.expenseClaim.count();
    return this.prisma.expenseClaim.create({
      data: {
        id: `EXP-${Date.now().toString(36)}`,
        claimNumber: `EXP-2026-${String(count + 1).padStart(3, '0')}`,
        employeeId,
        title: data.title, category: data.category || 'Travel',
        amount: Number(data.amount), currency: data.currency || 'INR',
        expenseDate: data.expenseDate, merchantName: data.merchantName,
        receiptUrl: data.receiptUrl || null, description: data.description || '',
        managerStatus: 'Pending', financeStatus: 'Pending', paymentStatus: 'Pending',
      },
    });
  }

  async update(id: string, data: any) {
    const updateData: any = {};
    if (data.managerStatus) updateData.managerStatus = data.managerStatus;
    if (data.financeStatus) updateData.financeStatus = data.financeStatus;
    if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus;
    if (typeof data.approvedAmount === 'number') updateData.approvedAmount = data.approvedAmount;
    if (data.paymentStatus === 'SettledInPayroll' || data.paymentStatus === 'DirectBankTransferred') {
      updateData.settlementDate = new Date().toISOString().split('T')[0];
    }
    return this.prisma.expenseClaim.update({ where: { id }, data: updateData });
  }
}
