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
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AssetsService = class AssetsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId, isAdmin = false) {
        return this.prisma.asset.findMany({
            where: isAdmin ? undefined : { assignedToId: employeeId },
            orderBy: { id: 'asc' },
            include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
        });
    }
    async create(data) {
        const count = await this.prisma.asset.count();
        return this.prisma.asset.create({
            data: {
                id: data.id || `AST-${String(count + 1).padStart(3, '0')}`,
                assetTag: data.assetTag || `APX-${(data.category || 'LT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                category: data.category,
                name: data.name,
                brand: data.brand,
                model: data.model,
                serialNumber: data.serialNumber,
                purchaseDate: data.purchaseDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                purchaseCost: data.purchaseCost || null,
                warrantyUntil: data.warrantyUntil || null,
                status: data.status || 'Available',
                assignedToId: data.assignedToId || null,
                location: data.location || 'Bengaluru Office',
                condition: data.condition || 'Good',
                lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                notes: data.notes || null,
            },
            include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
        });
    }
    async update(id, data) {
        return this.prisma.asset.update({
            where: { id },
            data: { ...data, lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            include: { assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } } },
        });
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map