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
exports.PayrollService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PayrollService = class PayrollService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPayslips(employeeId, monthYear) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (monthYear)
            where.monthYear = monthYear;
        return this.prisma.payslip.findMany({
            where,
            include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
            orderBy: { monthYear: 'desc' },
        });
    }
    async getCycles(status) {
        return this.prisma.payrollCycle.findMany({
            where: status ? { status } : {},
            include: { items: true },
            orderBy: { monthYear: 'desc' },
        });
    }
    async getSalaryStructure(employeeId) {
        return this.prisma.salaryStructure.findUnique({ where: { employeeId } });
    }
    async getLoans(employeeId) {
        return this.prisma.employeeLoanAdvance.findMany({
            where: employeeId ? { employeeId } : {},
            orderBy: { createdAt: 'desc' },
        });
    }
    async getTaxDeclarations(employeeId) {
        return this.prisma.employeeTaxDeclaration.findMany({
            where: { employeeId },
            orderBy: { financialYear: 'desc' },
        });
    }
};
exports.PayrollService = PayrollService;
exports.PayrollService = PayrollService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PayrollService);
//# sourceMappingURL=payroll.service.js.map