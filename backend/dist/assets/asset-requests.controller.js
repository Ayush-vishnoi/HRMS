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
exports.AssetRequestsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const assets_service_1 = require("./assets.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let AssetRequestsController = class AssetRequestsController {
    assetsService;
    constructor(assetsService) {
        this.assetsService = assetsService;
    }
    findAll(user) {
        if (user.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return this.assetsService.findAssetRequests();
    }
    review(user, body) {
        if (user.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required');
        }
        return this.assetsService.reviewAssetRequest(user.id, body);
    }
};
exports.AssetRequestsController = AssetRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AssetRequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AssetRequestsController.prototype, "review", null);
exports.AssetRequestsController = AssetRequestsController = __decorate([
    (0, common_1.Controller)('asset-requests'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [assets_service_1.AssetsService])
], AssetRequestsController);
//# sourceMappingURL=asset-requests.controller.js.map