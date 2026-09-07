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
exports.PerformanceController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const performance_service_1 = require("./performance.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let PerformanceController = class PerformanceController {
    performanceService;
    constructor(performanceService) {
        this.performanceService = performanceService;
    }
    findAll(user) {
        return this.performanceService.findAll(user);
    }
    createKra(user, body) {
        return this.performanceService.createKra(user, body);
    }
    updateKra(user, body) {
        return this.performanceService.updateKra(user, body);
    }
    getGoalsData(user, employeeId, _role) {
        return this.performanceService.getGoalsData(user, employeeId);
    }
    handleGoalAction(user, body) {
        return this.performanceService.handleGoalAction(user, body);
    }
    updateGoalTarget(user, body) {
        return this.performanceService.updateGoalTarget(user, body);
    }
    getCyclesData(user, employeeId, cycleId) {
        return this.performanceService.getCyclesData(user, employeeId, cycleId);
    }
    handleCycleAction(user, body) {
        return this.performanceService.handleCycleAction(user, body);
    }
    getCompetenciesData(user, employeeId, cycleId) {
        return this.performanceService.getCompetenciesData(user, employeeId, cycleId);
    }
    handleCompetencyAction(user, body) {
        return this.performanceService.handleCompetencyAction(user, body);
    }
    getPips(user, employeeId) {
        return this.performanceService.getPips(user, employeeId);
    }
    handlePipAction(user, body) {
        return this.performanceService.handlePipAction(user, body);
    }
    getCalibrationData(user, cycleId, departmentId) {
        return this.performanceService.getCalibrationData(user, cycleId, departmentId);
    }
    handleCalibrationAction(user, body) {
        return this.performanceService.handleCalibrationAction(user, body);
    }
};
exports.PerformanceController = PerformanceController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "createKra", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "updateKra", null);
__decorate([
    (0, common_1.Get)('goals'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getGoalsData", null);
__decorate([
    (0, common_1.Post)('goals'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "handleGoalAction", null);
__decorate([
    (0, common_1.Patch)('goals'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "updateGoalTarget", null);
__decorate([
    (0, common_1.Get)('cycles'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getCyclesData", null);
__decorate([
    (0, common_1.Post)('cycles'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "handleCycleAction", null);
__decorate([
    (0, common_1.Get)('competencies'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('cycleId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getCompetenciesData", null);
__decorate([
    (0, common_1.Post)('competencies'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "handleCompetencyAction", null);
__decorate([
    (0, common_1.Get)('pip'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getPips", null);
__decorate([
    (0, common_1.Post)('pip'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "handlePipAction", null);
__decorate([
    (0, common_1.Get)('calibration'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('cycleId')),
    __param(2, (0, common_1.Query)('departmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "getCalibrationData", null);
__decorate([
    (0, common_1.Post)('calibration'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], PerformanceController.prototype, "handleCalibrationAction", null);
exports.PerformanceController = PerformanceController = __decorate([
    (0, common_1.Controller)('performance'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [performance_service_1.PerformanceService])
], PerformanceController);
//# sourceMappingURL=performance.controller.js.map