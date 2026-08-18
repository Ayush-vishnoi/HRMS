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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpDeskService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const uuid_1 = require("uuid");
let HelpDeskService = class HelpDeskService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId, status, category) {
        const where = {};
        if (employeeId)
            where.employeeId = employeeId;
        if (status)
            where.status = status;
        if (category)
            where.category = category;
        return this.prisma.helpDeskTicket.findMany({
            where,
            include: {
                employee: { select: { id: true, name: true, employeeCode: true, avatarUrl: true } },
                resolvedBy: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(employeeId, data) {
        return this.prisma.helpDeskTicket.create({
            data: {
                id: (0, uuid_1.v4)(),
                employeeId,
                ...data,
                createdAt: new Date().toISOString(),
            },
        });
    }
    async resolve(id, resolvedById, resolution) {
        return this.prisma.helpDeskTicket.update({
            where: { id },
            data: {
                status: 'Resolved',
                resolution,
                resolvedById,
                resolvedAt: new Date().toISOString(),
            },
        });
    }
};
exports.HelpDeskService = HelpDeskService;
exports.HelpDeskService = HelpDeskService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HelpDeskService);
//# sourceMappingURL=help-desk.service.js.map