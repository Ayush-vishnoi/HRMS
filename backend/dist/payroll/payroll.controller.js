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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const payroll_service_1 = require("./payroll.service");
let PayrollController = class PayrollController {
    payrollService;
    constructor(payrollService) {
        this.payrollService = payrollService;
    }
    resolveUserId(req, headerUserId) {
        const user = req.user;
        if (user?.id)
            return user.id;
        if (user?.sub)
            return user.sub;
        if (headerUserId)
            return headerUserId;
        return '';
    }
    async getPayslips(employeeId, monthYear) {
        const data = await this.payrollService.getPayslips(employeeId, monthYear);
        return { success: true, data };
    }
    async getCycles(status, cycleId) {
        const data = await this.payrollService.getCycles(status, cycleId);
        return { success: true, data };
    }
    async getEngineCycles(cycleId) {
        const data = await this.payrollService.getCycles(undefined, cycleId);
        return { success: true, data };
    }
    async calculateCycle(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId) || 'EMP-006';
        const data = await this.payrollService.calculateAndSaveCycle(userId, body);
        return { success: true, data };
    }
    async updateCycle(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId) || 'EMP-006';
        const data = await this.payrollService.updateCycleStatus(userId, body);
        return { success: true, data };
    }
    async getSalaryStructure(employeeId) {
        const data = await this.payrollService.getSalaryStructure(employeeId);
        return { success: true, data };
    }
    async getLoans(employeeId) {
        const data = await this.payrollService.getLoans(employeeId);
        return { success: true, data };
    }
    async getTaxDeclarations(employeeId, financialYear) {
        const data = await this.payrollService.getTaxDeclarations(employeeId, financialYear);
        return { success: true, data };
    }
    async getReconciliation(currentCycleId, previousCycleId) {
        const data = await this.payrollService.getReconciliation(currentCycleId, previousCycleId);
        return { success: true, data };
    }
    async getReports(monthYear) {
        const data = await this.payrollService.getReports(monthYear);
        return { success: true, data };
    }
    async getForm16(employeeId, financialYear) {
        const data = await this.payrollService.getForm16(employeeId, financialYear || '2026-27');
        return { success: true, data };
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)('payslips'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('monthYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayslips", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getCycles", null);
__decorate([
    (0, common_1.Get)('engine'),
    __param(0, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getEngineCycles", null);
__decorate([
    (0, common_1.Post)('engine'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "calculateCycle", null);
__decorate([
    (0, common_1.Patch)('engine'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "updateCycle", null);
__decorate([
    (0, common_1.Get)('salary-structure/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getSalaryStructure", null);
__decorate([
    (0, common_1.Get)('loans'),
    __param(0, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getLoans", null);
__decorate([
    (0, common_1.Get)('tax-declarations'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('financialYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getTaxDeclarations", null);
__decorate([
    (0, common_1.Get)('reconciliation'),
    __param(0, (0, common_1.Query)('currentCycleId')),
    __param(1, (0, common_1.Query)('previousCycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getReconciliation", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('monthYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('form16'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('financialYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getForm16", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)('payroll'),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map