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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notify_service_1 = require("../common/notifications/notify.service");
let ExpensesService = class ExpensesService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(userId, userRole, view, employeeId) {
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
    async create(employeeId, data) {
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
    async update(id, data) {
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
        const updateData = {};
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
        if (data.paymentStatus)
            updateData.paymentStatus = data.paymentStatus;
        if (typeof data.approvedAmount === 'number')
            updateData.approvedAmount = data.approvedAmount;
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
                if (data.managerStatus === 'Rejected' && data.rejectionReason)
                    message += ` Reason: ${data.rejectionReason}`;
            }
            else if (data.financeStatus) {
                title = data.financeStatus === 'Approved' ? 'Expense claim approved by finance' : 'Expense claim rejected by finance';
                message = `Expense claim ${existing.claimNumber} (${existing.title}) was ${String(data.financeStatus).toLowerCase()} by finance.`;
                if (data.financeStatus === 'Rejected' && data.rejectionReason)
                    message += ` Reason: ${data.rejectionReason}`;
            }
            else if (data.paymentStatus) {
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
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, notify_service_1.NotifyService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map