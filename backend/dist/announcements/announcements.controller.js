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
exports.AnnouncementsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const announcements_service_1 = require("./announcements.service");
let AnnouncementsController = class AnnouncementsController {
    announcementsService;
    constructor(announcementsService) {
        this.announcementsService = announcementsService;
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
    async findAll(req, scope, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.announcementsService.findAll(userId, scope);
        return { success: true, data };
    }
    async create(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.announcementsService.create(userId, body);
        return { success: true, data };
    }
    async update(req, body, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        const data = await this.announcementsService.update(userId, body.id, body);
        return { success: true, data };
    }
    async delete(req, id, headerUserId) {
        const userId = this.resolveUserId(req, headerUserId);
        if (!userId)
            return { success: false, error: 'Unauthorized' };
        return this.announcementsService.delete(userId, id);
    }
};
exports.AnnouncementsController = AnnouncementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('scope')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('id')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "delete", null);
exports.AnnouncementsController = AnnouncementsController = __decorate([
    (0, common_1.Controller)('announcements'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [announcements_service_1.AnnouncementsService])
], AnnouncementsController);
//# sourceMappingURL=announcements.controller.js.map