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
exports.EmployeeLifecycleController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const employee_lifecycle_service_1 = require("./employee-lifecycle.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let EmployeeLifecycleController = class EmployeeLifecycleController {
    lifecycleService;
    constructor(lifecycleService) {
        this.lifecycleService = lifecycleService;
    }
    findAll(employeeId) {
        return this.lifecycleService.findAll(employeeId);
    }
    handleAction(user, body) {
        switch (body.action) {
            case 'onboard': return this.lifecycleService.onboard(user, body);
            case 'update_task': return this.lifecycleService.updateTask(body.taskId, body.status);
            case 'update_bgv': return this.lifecycleService.updateBgv(body.bgvId, body.status, body.vendorNotes);
            case 'probation_action': return this.lifecycleService.probationAction(body);
            case 'transfer_request': return this.lifecycleService.transferRequest(user, body);
            case 'promotion_request': return this.lifecycleService.promotionRequest(user, body);
            default: return { success: false, error: 'Invalid lifecycle action' };
        }
    }
};
exports.EmployeeLifecycleController = EmployeeLifecycleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeeLifecycleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeeLifecycleController.prototype, "handleAction", null);
exports.EmployeeLifecycleController = EmployeeLifecycleController = __decorate([
    (0, common_1.Controller)('employee-lifecycle'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [employee_lifecycle_service_1.EmployeeLifecycleService])
], EmployeeLifecycleController);
//# sourceMappingURL=employee-lifecycle.controller.js.map