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
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const RECEIPTS_DIR = (0, node_path_1.join)(process.cwd(), 'uploads', 'receipts');
const MIME_BY_EXT = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
};
let UploadsController = class UploadsController {
    serveReceipt(filename, res) {
        const safeName = (0, node_path_1.basename)(filename);
        const filePath = (0, node_path_1.join)(RECEIPTS_DIR, safeName);
        if (!(0, node_fs_1.existsSync)(filePath) || !(0, node_fs_1.statSync)(filePath).isFile()) {
            throw new common_1.NotFoundException('Receipt not found.');
        }
        const contentType = MIME_BY_EXT[safeName.slice(safeName.lastIndexOf('.')).toLowerCase()];
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }
        const stat = (0, node_fs_1.statSync)(filePath);
        res.setHeader('Content-Length', stat.size);
        const stream = (0, node_fs_1.createReadStream)(filePath);
        stream.pipe(res);
        return res;
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Get)(':filename'),
    (0, common_1.Header)('Cache-Control', 'private, max-age=3600'),
    __param(0, (0, common_1.Param)('filename')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], UploadsController.prototype, "serveReceipt", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('uploads/receipts'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'))
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map