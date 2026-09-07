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
exports.EmployeesController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const employees_service_1 = require("./employees.service");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
let EmployeesController = class EmployeesController {
    employeesService;
    constructor(employeesService) {
        this.employeesService = employeesService;
    }
    findAll(department, status, search) {
        return this.employeesService.findAll({ department, status, search });
    }
    create(user, body) {
        if (user?.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Only administrators can create employees');
        }
        return this.employeesService.create(body);
    }
    get360(id, role, currentUserId) {
        return this.employeesService.get360(id, { role, currentUserId });
    }
    findOne(id) {
        return this.employeesService.findOne(id);
    }
    update(id, body) {
        return this.employeesService.update(id, body);
    }
};
exports.EmployeesController = EmployeesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('department')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id/360'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('role')),
    __param(2, (0, common_1.Query)('currentUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "get360", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EmployeesController.prototype, "update", null);
exports.EmployeesController = EmployeesController = __decorate([
    (0, common_1.Controller)('employees'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [employees_service_1.EmployeesService])
], EmployeesController);
//# sourceMappingURL=employees.controller.js.map