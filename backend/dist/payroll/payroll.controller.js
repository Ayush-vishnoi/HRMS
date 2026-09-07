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
const passport_1 = require("@nestjs/passport");
const payroll_service_1 = require("./payroll.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let PayrollController = class PayrollController {
    payrollService;
    constructor(payrollService) {
        this.payrollService = payrollService;
    }
    getOverview(user, view) {
        return this.payrollService.getPayrollOverview(user, view || 'my');
    }
    getStructures(employeeId) {
        return this.payrollService.getSalaryStructures(employeeId);
    }
    saveStructure(user, body) {
        return this.payrollService.saveSalaryStructure(user, body);
    }
    getVariablePay(user, employeeId, monthYear, view) {
        return this.payrollService.getVariablePayRecords(user, employeeId, monthYear, view);
    }
    createVariablePay(user, body) {
        return this.payrollService.createVariablePayRecord(user, body);
    }
    getStatutory() {
        return this.payrollService.getStatutoryRules();
    }
    createStatutory(user, body) {
        return this.payrollService.createStatutoryRule(user, body);
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
    async calculateCycle(user, body) {
        const data = await this.payrollService.calculateAndSaveCycle(user.id, body);
        return { success: true, data };
    }
    async updateCycle(user, body) {
        const data = await this.payrollService.updateCycleStatus(user.id, body);
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
    async saveTaxDeclaration(user, body) {
        const data = await this.payrollService.saveTaxDeclaration(user, body);
        return { success: true, data };
    }
    async verifyTaxDeclaration(user, body) {
        const data = await this.payrollService.verifyTaxDeclaration(user, body);
        return { success: true, data };
    }
    async runReconciliation(user, body) {
        const data = await this.payrollService.runReconciliation(user, body);
        return { success: true, data };
    }
    async generatePdf(user, body, res) {
        const html = await this.payrollService.generatePdfDocument(user, body);
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Content-Disposition', 'inline; filename="document.html"');
        res.send(Buffer.from(html, 'utf-8'));
    }
    async getReconciliation(currentCycleId, previousCycleId) {
        const data = await this.payrollService.getReconciliation(currentCycleId, previousCycleId);
        return { success: true, data };
    }
    async getReports(type, monthYear) {
        const data = await this.payrollService.getReports(type, monthYear);
        return { success: true, data };
    }
    async getForm16(employeeId, financialYear) {
        const data = await this.payrollService.getForm16(employeeId, financialYear || '2026-27');
        return { success: true, data };
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('view')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Get)('structures'),
    __param(0, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getStructures", null);
__decorate([
    (0, common_1.Post)('structures'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "saveStructure", null);
__decorate([
    (0, common_1.Get)('variable-pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('monthYear')),
    __param(3, (0, common_1.Query)('view')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getVariablePay", null);
__decorate([
    (0, common_1.Post)('variable-pay'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "createVariablePay", null);
__decorate([
    (0, common_1.Get)('statutory-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getStatutory", null);
__decorate([
    (0, common_1.Post)('statutory-rules'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "createStatutory", null);
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
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "calculateCycle", null);
__decorate([
    (0, common_1.Patch)('engine'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
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
    (0, common_1.Post)('tax-declarations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "saveTaxDeclaration", null);
__decorate([
    (0, common_1.Patch)('tax-declarations'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "verifyTaxDeclaration", null);
__decorate([
    (0, common_1.Post)('reconciliation'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "runReconciliation", null);
__decorate([
    (0, common_1.Post)('pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "generatePdf", null);
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
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('monthYear')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
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
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map