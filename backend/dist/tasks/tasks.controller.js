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
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const tasks_service_1 = require("./tasks.service");
let TasksController = class TasksController {
    tasksService;
    constructor(tasksService) {
        this.tasksService = tasksService;
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
    async getDirectReports(req, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.tasksService.getDirectReports(userId);
        return { success: true, data };
    }
    async findAll(req, scope, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const res = await this.tasksService.findAll(userId, scope);
        if (scope === 'team') {
            return { success: true, ...res };
        }
        return { success: true, data: res };
    }
    async create(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.tasksService.create(userId, body);
        return { success: true, data };
    }
    async update(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.tasksService.update(userId, body);
        return { success: true, data };
    }
    async delete(req, id, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        return this.tasksService.delete(userId, id);
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)('direct-reports'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "getDirectReports", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('scope')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('id')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "delete", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)('tasks'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [tasks_service_1.TasksService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map