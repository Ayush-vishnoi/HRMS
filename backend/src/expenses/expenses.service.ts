import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService, private notify: NotifyService) {}

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
    const claimNumber = `EXP-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const created = await this.prisma.expenseClaim.create({
      data: {
        claimNumber,
        employeeId,
        title: data.title, category: data.category || 'Travel',
        amount: Number(data.amount), currency: data.currency || 'INR',
        expenseDate: data.expenseDate, merchantName: data.merchantName,
        receiptUrl: data.receiptUrl || null, description: data.description || '',
        managerStatus: 'Pending', financeStatus: 'Pending', paymentStatus: 'Pending',
      },
    });
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true },
    });
    await this.notify.notifyManagerOf(employeeId, {
      title: 'New expense claim submitted',
      message: `${employee?.name ?? 'An employee'} submitted expense claim ${claimNumber} (${data.title}) for ${data.currency || 'INR'} ${Number(data.amount).toFixed(2)}.`,
      type: 'Expense',
      linkUrl: '/expenses',
    });
    return created;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.expenseClaim.findUnique({ where: { id } });
    if (data.resubmit) {
      const updated = await this.prisma.expenseClaim.update({
        where: { id },
        data: {
          managerStatus: 'Pending', financeStatus: 'Pending', paymentStatus: 'Pending',
          managerRejectionReason: null, hrRejectionReason: null,
        },
      });
      if (existing) {
        await this.notify.notifyManagerOf(existing.employeeId, {
          title: 'Expense claim resubmitted',
          message: `Expense claim ${existing.claimNumber} (${existing.title}) has been resubmitted for approval.`,
          type: 'Expense',
          linkUrl: '/expenses',
        });
      }
      return updated;
    }
    const updateData: any = {};
    if (data.managerStatus) {
      updateData.managerStatus = data.managerStatus;
      if (data.managerStatus === 'Rejected' && data.rejectionReason)
        updateData.managerRejectionReason = data.rejectionReason;
    }
    if (data.financeStatus) {
      updateData.financeStatus = data.financeStatus;
      if (data.financeStatus === 'Rejected' && data.rejectionReason)
        updateData.hrRejectionReason = data.rejectionReason;
    }
    if (data.paymentStatus) updateData.paymentStatus = data.paymentStatus;
    if (typeof data.approvedAmount === 'number') updateData.approvedAmount = data.approvedAmount;
    if (data.paymentStatus === 'SettledInPayroll' || data.paymentStatus === 'DirectBankTransferred') {
      updateData.settlementDate = new Date().toISOString().split('T')[0];
    }
    const updated = await this.prisma.expenseClaim.update({ where: { id }, data: updateData });
    if (existing) {
      let title = '';
      let message = '';
      if (data.managerStatus) {
        title = data.managerStatus === 'Approved' ? 'Expense claim approved by manager' : 'Expense claim rejected by manager';
        message = `Expense claim ${existing.claimNumber} (${existing.title}) was ${String(data.managerStatus).toLowerCase()} by your manager.`;
        if (data.managerStatus === 'Rejected' && data.rejectionReason) message += ` Reason: ${data.rejectionReason}`;
      } else if (data.financeStatus) {
        title = data.financeStatus === 'Approved' ? 'Expense claim approved by finance' : 'Expense claim rejected by finance';
        message = `Expense claim ${existing.claimNumber} (${existing.title}) was ${String(data.financeStatus).toLowerCase()} by finance.`;
        if (data.financeStatus === 'Rejected' && data.rejectionReason) message += ` Reason: ${data.rejectionReason}`;
      } else if (data.paymentStatus) {
        title = 'Expense payment update';
        message = `Payment for expense claim ${existing.claimNumber} (${existing.title}) is now marked as ${data.paymentStatus}.`;
      }
      if (title) {
        await this.notify.notifyUser({
          userId: existing.employeeId,
          title,
          message,
          type: 'Expense',
          linkUrl: '/expenses',
        });
      }
    }
    return updated;
  }
}
