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
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
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
    async update(id, data) {
        const updateData = {};
        if (data.managerStatus)
            updateData.managerStatus = data.managerStatus;
        if (data.financeStatus)
            updateData.financeStatus = data.financeStatus;
        if (data.paymentStatus)
            updateData.paymentStatus = data.paymentStatus;
        if (typeof data.approvedAmount === 'number')
            updateData.approvedAmount = data.approvedAmount;
        if (data.paymentStatus === 'SettledInPayroll' || data.paymentStatus === 'DirectBankTransferred') {
            updateData.settlementDate = new Date().toISOString().split('T')[0];
        }
        return this.prisma.expenseClaim.update({ where: { id }, data: updateData });
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map