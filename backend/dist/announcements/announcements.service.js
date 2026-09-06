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
exports.AnnouncementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AnnouncementsService = class AnnouncementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    serialize(announcement) {
        return {
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            category: announcement.category,
            postedByDepartment: announcement.postedByDepartment,
            postedByName: announcement.postedBy?.name ?? null,
            isPinned: announcement.isPinned,
            publishedAt: announcement.publishedAt ? new Date(announcement.publishedAt).toISOString() : null,
            expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString() : null,
            targetAudience: announcement.targetAudience,
            targetDepartment: announcement.targetDepartment,
            targetLocation: announcement.targetLocation,
            targetRole: announcement.targetRole,
            isArchived: announcement.isArchived,
            createdAt: announcement.createdAt ? new Date(announcement.createdAt).toISOString() : null,
            updatedAt: announcement.updatedAt ? new Date(announcement.updatedAt).toISOString() : null,
        };
    }
    async findAll(userId, scope) {
        const viewer = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, department: true, location: true, userRole: true },
        });
        if (!viewer) {
            throw new common_1.NotFoundException('Employee not found');
        }
        if (scope === 'admin') {
            if (viewer.userRole !== 'admin') {
                throw new common_1.ForbiddenException('Admin access required');
            }
            const announcements = await this.prisma.announcement.findMany({
                orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
                include: { postedBy: { select: { id: true, name: true, email: true } } },
            });
            return announcements.map((a) => this.serialize(a));
        }
        const now = new Date();
        const where = {
            isArchived: false,
            AND: [
                {
                    OR: [
                        { targetAudience: 'All' },
                        { targetAudience: 'Department', targetDepartment: viewer.department },
                        { targetAudience: 'Location', targetLocation: viewer.location },
                        { targetAudience: 'Role', targetRole: viewer.userRole },
                    ],
                },
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            ],
        };
        const limit = scope === 'dashboard' ? 3 : undefined;
        const announcements = await this.prisma.announcement.findMany({
            where,
            orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
            take: limit,
            include: { postedBy: { select: { id: true, name: true, email: true } } },
        });
        return announcements.map((a) => this.serialize(a));
    }
    async create(userId, body) {
        const admin = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { id: true, userRole: true, department: true },
        });
        if (!admin || admin.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required');
        }
        const title = (body.title || '').trim();
        const bodyText = (body.body || '').trim();
        if (!title)
            throw new common_1.BadRequestException('Title is required');
        if (!bodyText)
            throw new common_1.BadRequestException('Body is required');
        const count = await this.prisma.announcement.count();
        const newId = `ANN-${String(count + 1).padStart(3, '0')}`;
        const announcement = await this.prisma.announcement.create({
            data: {
                id: newId,
                title,
                body: bodyText,
                category: (body.category || 'General'),
                postedById: admin.id,
                postedByDepartment: (body.postedByDepartment || admin.department || 'HR').trim(),
                isPinned: body.isPinned === true,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
                targetAudience: (body.targetAudience || 'All'),
                targetDepartment: body.targetDepartment || null,
                targetLocation: body.targetLocation || null,
                targetRole: body.targetRole || null,
            },
            include: { postedBy: { select: { id: true, name: true, email: true } } },
        });
        return this.serialize(announcement);
    }
    async update(userId, id, body) {
        const admin = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { userRole: true },
        });
        if (!admin || admin.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required');
        }
        if (body.action === 'archive' || body.action === 'unarchive') {
            const updated = await this.prisma.announcement.update({
                where: { id },
                data: { isArchived: body.action === 'archive' },
                include: { postedBy: { select: { id: true, name: true, email: true } } },
            });
            return this.serialize(updated);
        }
        if (body.action === 'pin' || body.action === 'unpin') {
            const updated = await this.prisma.announcement.update({
                where: { id },
                data: { isPinned: body.action === 'pin' },
                include: { postedBy: { select: { id: true, name: true, email: true } } },
            });
            return this.serialize(updated);
        }
        const data = {};
        if (body.title)
            data.title = body.title.trim();
        if (body.body)
            data.body = body.body.trim();
        if (body.category)
            data.category = body.category;
        if (body.postedByDepartment)
            data.postedByDepartment = body.postedByDepartment.trim();
        if (typeof body.isPinned === 'boolean')
            data.isPinned = body.isPinned;
        if (body.expiresAt !== undefined)
            data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
        if (body.targetAudience)
            data.targetAudience = body.targetAudience;
        if (body.targetDepartment !== undefined)
            data.targetDepartment = body.targetDepartment;
        if (body.targetLocation !== undefined)
            data.targetLocation = body.targetLocation;
        if (body.targetRole !== undefined)
            data.targetRole = body.targetRole;
        const updated = await this.prisma.announcement.update({
            where: { id },
            data,
            include: { postedBy: { select: { id: true, name: true, email: true } } },
        });
        return this.serialize(updated);
    }
    async delete(userId, id) {
        const admin = await this.prisma.employee.findUnique({
            where: { id: userId },
            select: { userRole: true },
        });
        if (!admin || admin.userRole !== 'admin') {
            throw new common_1.ForbiddenException('Admin access required');
        }
        await this.prisma.announcement.delete({ where: { id } });
        return { success: true, id };
    }
};
exports.AnnouncementsService = AnnouncementsService;
exports.AnnouncementsService = AnnouncementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnnouncementsService);
//# sourceMappingURL=announcements.service.js.map