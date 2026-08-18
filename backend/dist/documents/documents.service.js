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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let DocumentsService = class DocumentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(employeeId, isAdmin, requestedEmployeeId) {
        const targetId = requestedEmployeeId || employeeId;
        const whereClause = isAdmin && !requestedEmployeeId ? undefined : { employeeId: targetId };
        const [documents, requests] = await Promise.all([
            this.prisma.employeeDocument.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
            }),
            this.prisma.documentRequest.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
            }),
        ]);
        return { documents, requests };
    }
    async uploadDocument(employeeId, data) {
        const count = await this.prisma.employeeDocument.count();
        return this.prisma.employeeDocument.create({
            data: {
                id: `DOC-${204 + count + 1}`,
                employeeId,
                name: data.name,
                type: data.type || 'Identity Proof',
                size: data.size || '1.0 MB',
                status: 'UnderReview',
                note: data.note || 'Uploaded by employee and queued for HR verification.',
                uploadedOn: data.uploadedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
            },
            include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
        });
    }
    async createRequest(employeeId, data) {
        const count = await this.prisma.documentRequest.count();
        return this.prisma.documentRequest.create({
            data: {
                id: `REQ-${87 + count + 1}`,
                employeeId,
                documentType: data.documentType,
                reason: data.reason,
                status: 'Pending',
                requestedOn: data.requestedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
            },
            include: { employee: { select: { id: true, name: true, employeeCode: true, department: true } } },
        });
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map