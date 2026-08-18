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
    getPayslips(employeeId, monthYear, userId) {
        return this.payrollService.getPayslips(employeeId, monthYear);
    }
    getCycles(status) {
        return this.payrollService.getCycles(status);
    }
    getSalaryStructure(employeeId) {
        return this.payrollService.getSalaryStructure(employeeId);
    }
    getLoans(employeeId) {
        return this.payrollService.getLoans(employeeId);
    }
    getTaxDeclarations(employeeId, userId) {
        return this.payrollService.getTaxDeclarations(employeeId || userId);
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)('payslips'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('monthYear')),
    __param(2, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getPayslips", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getCycles", null);
__decorate([
    (0, common_1.Get)('salary-structure/:employeeId'),
    __param(0, (0, common_1.Param)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getSalaryStructure", null);
__decorate([
    (0, common_1.Get)('loans'),
    __param(0, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getLoans", null);
__decorate([
    (0, common_1.Get)('tax-declarations'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PayrollController.prototype, "getTaxDeclarations", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)('payroll'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [payroll_service_1.PayrollService])
], PayrollController);
//# sourceMappingURL=payroll.controller.js.map