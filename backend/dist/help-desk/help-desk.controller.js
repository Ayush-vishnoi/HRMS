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
exports.HelpDeskController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const help_desk_service_1 = require("./help-desk.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let HelpDeskController = class HelpDeskController {
    helpDeskService;
    constructor(helpDeskService) {
        this.helpDeskService = helpDeskService;
    }
    findAll(employeeId, status, category) {
        return this.helpDeskService.findAll(employeeId, status, category);
    }
    create(userId, body) {
        return this.helpDeskService.create(userId, body);
    }
    resolve(id, userId, resolution) {
        return this.helpDeskService.resolve(id, userId, resolution);
    }
};
exports.HelpDeskController = HelpDeskController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HelpDeskController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HelpDeskController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Body)('resolution')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], HelpDeskController.prototype, "resolve", null);
exports.HelpDeskController = HelpDeskController = __decorate([
    (0, common_1.Controller)('help-desk'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [help_desk_service_1.HelpDeskService])
], HelpDeskController);
//# sourceMappingURL=help-desk.controller.js.map