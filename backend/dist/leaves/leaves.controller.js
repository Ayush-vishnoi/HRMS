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
exports.LeavesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const leaves_service_1 = require("./leaves.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let LeavesController = class LeavesController {
    leavesService;
    constructor(leavesService) {
        this.leavesService = leavesService;
    }
    async getAll(userId, employeeId, status) {
        const targetId = employeeId || userId;
        const [requests, balances] = await Promise.all([
            this.leavesService.getRequests(employeeId, status),
            this.leavesService.getBalances(targetId),
        ]);
        return { requests, balances };
    }
    getBalances(employeeId, userId) {
        return this.leavesService.getBalances(employeeId || userId);
    }
    getRequests(employeeId, status) {
        return this.leavesService.getRequests(employeeId, status);
    }
    createRequest(userId, body) {
        const { employeeId, ...rest } = body;
        return this.leavesService.createRequest({ ...rest, employeeId: employeeId || userId });
    }
    reviewRequest(body, userId) {
        return this.leavesService.reviewRequest(body.id, body.status, body.reviewerId || userId);
    }
};
exports.LeavesController = LeavesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('employeeId')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LeavesController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('balances'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "getBalances", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "getRequests", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LeavesController.prototype, "reviewRequest", null);
exports.LeavesController = LeavesController = __decorate([
    (0, common_1.Controller)('leaves'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [leaves_service_1.LeavesService])
], LeavesController);
//# sourceMappingURL=leaves.controller.js.map