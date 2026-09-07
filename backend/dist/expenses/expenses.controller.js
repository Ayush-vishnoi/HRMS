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
exports.ExpensesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const multer_1 = require("@nestjs/platform-express/multer");
const multer_2 = require("multer");
const node_path_1 = require("node:path");
const expenses_service_1 = require("./expenses.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const ALLOWED_RECEIPT_MIMES = new Set([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
]);
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const receiptStorage = (0, multer_2.diskStorage)({
    destination: './uploads/receipts',
    filename: (_req, file, cb) => {
        const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        cb(null, `${unique}${(0, node_path_1.extname)(file.originalname).toLowerCase()}`);
    },
});
let ExpensesController = class ExpensesController {
    expensesService;
    constructor(expensesService) {
        this.expensesService = expensesService;
    }
    findAll(user, view = 'my', employeeId) {
        return this.expensesService.findAll(user.id, user.userRole, view, employeeId);
    }
    uploadReceipt(user, file) {
        if (!file) {
            throw new common_1.BadRequestException('A receipt file is required.');
        }
        if (!ALLOWED_RECEIPT_MIMES.has(file.mimetype)) {
            throw new common_1.BadRequestException('Only PDF, JPG, PNG, and WEBP receipts are supported.');
        }
        if (file.size > MAX_RECEIPT_BYTES) {
            throw new common_1.BadRequestException('Receipt must be 10 MB or smaller.');
        }
        return { receiptUrl: `/api/uploads/receipts/${file.filename}`, uploadedBy: user.id };
    }
    create(user, body) {
        return this.expensesService.create(body.employeeId || user.id, body);
    }
    update(body) {
        const { id, ...data } = body;
        return this.expensesService.update(id, data);
    }
};
exports.ExpensesController = ExpensesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('view')),
    __param(2, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, multer_1.FileInterceptor)('receipt', { storage: receiptStorage })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "uploadReceipt", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "update", null);
exports.ExpensesController = ExpensesController = __decorate([
    (0, common_1.Controller)('expenses'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService])
], ExpensesController);
//# sourceMappingURL=expenses.controller.js.map