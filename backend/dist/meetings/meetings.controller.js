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
exports.MeetingsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const meetings_service_1 = require("./meetings.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let MeetingsController = class MeetingsController {
    meetingsService;
    constructor(meetingsService) {
        this.meetingsService = meetingsService;
    }
    async findAll(userId, search, id, from, to, type, department, mine) {
        if (search !== undefined && search !== null) {
            const data = await this.meetingsService.searchEmployees(search);
            return { success: true, data };
        }
        if (id) {
            const data = await this.meetingsService.findOne(userId, id);
            return { success: true, data };
        }
        const data = await this.meetingsService.findAll(userId, { from, to, type, department, mine });
        return { success: true, data };
    }
    async create(userId, body) {
        const data = await this.meetingsService.create(userId, body);
        return { success: true, data };
    }
    async update(userId, body) {
        const data = await this.meetingsService.update(userId, body);
        return { success: true, data };
    }
};
exports.MeetingsController = MeetingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('id')),
    __param(3, (0, common_1.Query)('from')),
    __param(4, (0, common_1.Query)('to')),
    __param(5, (0, common_1.Query)('type')),
    __param(6, (0, common_1.Query)('department')),
    __param(7, (0, common_1.Query)('mine')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "update", null);
exports.MeetingsController = MeetingsController = __decorate([
    (0, common_1.Controller)('meetings'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService])
], MeetingsController);
//# sourceMappingURL=meetings.controller.js.map