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
const notify_service_1 = require("../common/notifications/notify.service");
const asset_enums_1 = require("./asset-enums");
const ASSET_CATEGORIES = ['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'];
const URGENCY_LEVELS = ['Low', 'Medium', 'High'];
const formatDisplayDate = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
let AssetsService = class AssetsService {
    prisma;
    notify;
    constructor(prisma, notify) {
        this.prisma = prisma;
        this.notify = notify;
    }
    async findAll(employeeId, isAdmin = false) {
        const assets = await this.prisma.asset.findMany({
            where: isAdmin ? undefined : { assignedToId: employeeId },
            orderBy: { id: 'asc' },
            include: {
                assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } },
            },
        });
        return assets.map(asset_enums_1.serializeAsset);
    }
    async create(body) {
        const count = await this.prisma.asset.count();
        const newAsset = await this.prisma.asset.create({
            data: {
                id: body.id || `AST-${String(count + 1).padStart(3, '0')}`,
                assetTag: body.assetTag ||
                    `APX-${(body.category || 'LT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                category: (0, asset_enums_1.toPrismaAssetCategory)(body.category || 'Other'),
                name: body.name,
                brand: body.brand,
                model: body.model,
                serialNumber: body.serialNumber,
                purchaseDate: body.purchaseDate || formatDisplayDate(),
                purchaseCost: body.purchaseCost || null,
                warrantyUntil: body.warrantyUntil || null,
                status: body.status || 'Available',
                assignedToId: body.assignedToId || null,
                location: body.location || 'Bengaluru Office',
                condition: body.condition ? (0, asset_enums_1.toPrismaAssetCondition)(body.condition) : 'Good',
                lastChecked: formatDisplayDate(),
                allocationDate: body.assignedToId ? formatDisplayDate() : null,
                acknowledgedAt: null,
                notes: body.notes || null,
            },
            include: {
                assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } },
            },
        });
        if (newAsset.assignedToId) {
            await this.notify.notifyUser({
                userId: newAsset.assignedToId,
                title: 'New Asset Assigned',
                message: `A ${newAsset.name} (${newAsset.assetTag}) has been assigned to you. Please confirm receipt in My Assets.`,
                type: 'Asset',
                linkUrl: '/my-assets',
            });
        }
        return (0, asset_enums_1.serializeAsset)(newAsset);
    }
    async update(id, body) {
        const existing = await this.prisma.asset.findUnique({
            where: { id },
            select: { id: true, assignedToId: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Asset not found');
        }
        const assigneeChanged = body.assignedToId !== undefined && (body.assignedToId || null) !== existing.assignedToId;
        const nowAssigned = assigneeChanged ? body.assignedToId || null : existing.assignedToId;
        const updated = await this.prisma.asset.update({
            where: { id },
            data: {
                ...(body.assetTag !== undefined ? { assetTag: body.assetTag } : {}),
                ...(body.category !== undefined ? { category: (0, asset_enums_1.toPrismaAssetCategory)(body.category) } : {}),
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.brand !== undefined ? { brand: body.brand } : {}),
                ...(body.model !== undefined ? { model: body.model } : {}),
                ...(body.serialNumber !== undefined ? { serialNumber: body.serialNumber } : {}),
                ...(body.purchaseDate !== undefined ? { purchaseDate: body.purchaseDate } : {}),
                ...(body.purchaseCost !== undefined ? { purchaseCost: body.purchaseCost || null } : {}),
                ...(body.warrantyUntil !== undefined ? { warrantyUntil: body.warrantyUntil || null } : {}),
                ...(body.status !== undefined ? { status: body.status } : {}),
                ...(body.assignedToId !== undefined ? { assignedToId: body.assignedToId || null } : {}),
                ...(body.location !== undefined ? { location: body.location } : {}),
                ...(body.condition !== undefined
                    ? { condition: (0, asset_enums_1.toPrismaAssetCondition)(body.condition) }
                    : {}),
                ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
                ...(assigneeChanged
                    ? {
                        allocationDate: nowAssigned ? formatDisplayDate() : null,
                        acknowledgedAt: null,
                    }
                    : {}),
                lastChecked: formatDisplayDate(),
            },
            include: {
                assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } },
            },
        });
        if (updated.assignedToId) {
            await this.notify.notifyUser({
                userId: updated.assignedToId,
                title: assigneeChanged ? 'Asset Assigned' : 'Asset Update',
                message: assigneeChanged
                    ? `A ${updated.name} (${updated.assetTag}) has been assigned to you. Please confirm receipt in My Assets.`
                    : `Your assigned asset ${updated.name} (${updated.assetTag}) was updated by admin.`,
                type: 'Asset',
                linkUrl: '/my-assets',
            });
        }
        return (0, asset_enums_1.serializeAsset)(updated);
    }
    async remove(id) {
        await this.prisma.asset.delete({ where: { id } });
        return { id };
    }
    async findMyAssets(employeeId) {
        const [assets, requests] = await Promise.all([
            this.prisma.asset.findMany({
                where: { assignedToId: employeeId },
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    assetTag: true,
                    category: true,
                    name: true,
                    brand: true,
                    model: true,
                    serialNumber: true,
                    status: true,
                    condition: true,
                    location: true,
                    purchaseDate: true,
                    warrantyUntil: true,
                    allocationDate: true,
                    acknowledgedAt: true,
                    updatedAt: true,
                },
            }),
            this.prisma.assetRequest.findMany({
                where: { requestedById: employeeId },
                orderBy: { createdAt: 'desc' },
                include: {
                    asset: { select: { id: true, name: true, assetTag: true } },
                },
            }),
        ]);
        return {
            assets: assets.map(asset_enums_1.serializeAsset),
            requests: requests.map(asset_enums_1.serializeAssetRequest),
        };
    }
    async acknowledgeAsset(employeeId, assetId) {
        const asset = await this.prisma.asset.findFirst({
            where: { id: assetId, assignedToId: employeeId },
            select: { id: true, name: true, assetTag: true, acknowledgedAt: true },
        });
        if (!asset) {
            throw new common_1.NotFoundException('Asset not found');
        }
        if (asset.acknowledgedAt) {
            return { assetId: asset.id, alreadyAcknowledged: true };
        }
        const updated = await this.prisma.asset.update({
            where: { id: asset.id },
            data: { acknowledgedAt: new Date() },
            select: { id: true, acknowledgedAt: true },
        });
        return updated;
    }
    async createAssetRequest(employee, body) {
        const type = body?.type;
        if (!['New Asset', 'Issue Report', 'Return'].includes(type)) {
            throw new common_1.BadRequestException('Invalid request type');
        }
        const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
        if (!reason || reason.length < 5) {
            throw new common_1.BadRequestException('Please describe your reason (min 5 characters)');
        }
        if (reason.length > 500) {
            throw new common_1.BadRequestException('Reason is too long (max 500 characters)');
        }
        let asset = null;
        if (type !== 'New Asset') {
            asset = await this.prisma.asset.findFirst({
                where: { id: body.assetId, assignedToId: employee.id },
                select: { id: true, name: true, assetTag: true },
            });
            if (!asset) {
                throw new common_1.BadRequestException('Select one of your assigned assets');
            }
        }
        let category;
        if (type === 'New Asset') {
            category = body.category;
            if (!category || !ASSET_CATEGORIES.includes(category)) {
                throw new common_1.BadRequestException('Select a valid asset category');
            }
        }
        let urgency;
        if (type === 'Issue Report') {
            urgency = body.urgency;
            if (!urgency || !URGENCY_LEVELS.includes(urgency)) {
                throw new common_1.BadRequestException('Select an urgency level');
            }
        }
        const count = await this.prisma.assetRequest.count();
        const id = `AR-${String(count + 1).padStart(3, '0')}`;
        const created = await this.prisma.assetRequest.create({
            data: {
                id,
                type: (0, asset_enums_1.toPrismaRequestType)(type),
                requestedById: employee.id,
                assetId: asset?.id ?? null,
                category: category ? (0, asset_enums_1.toPrismaAssetCategory)(category) : null,
                reason,
                urgency: urgency ?? null,
            },
            include: {
                asset: { select: { id: true, name: true, assetTag: true } },
            },
        });
        await this.notify.notifyAdmins({
            title: 'New Asset Request',
            message: type === 'New Asset'
                ? `${employee.name} requested a new asset (${category}).`
                : type === 'Issue Report'
                    ? `${employee.name} reported an issue on ${asset?.name ?? 'an asset'} (${urgency} urgency).`
                    : `${employee.name} requested return of ${asset?.name ?? 'an asset'}.`,
            type: 'Asset',
            linkUrl: '/assets?tab=requests',
        });
        return (0, asset_enums_1.serializeAssetRequest)(created);
    }
    async findAssetRequests() {
        const requests = await this.prisma.assetRequest.findMany({
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
            include: {
                requestedBy: {
                    select: { id: true, name: true, employeeCode: true, department: true, email: true },
                },
                asset: { select: { id: true, name: true, assetTag: true, serialNumber: true, status: true } },
                reviewedBy: { select: { id: true, name: true } },
            },
        });
        return { requests: requests.map(asset_enums_1.serializeAssetRequest) };
    }
    async reviewAssetRequest(adminId, body) {
        const id = body?.id;
        const decision = body?.decision;
        if (!id || !['Approved', 'Rejected'].includes(decision)) {
            throw new common_1.BadRequestException('Provide id and decision (Approved/Rejected)');
        }
        const reviewNote = typeof body.reviewNote === 'string' && body.reviewNote.trim()
            ? body.reviewNote.trim().slice(0, 500)
            : null;
        const existing = await this.prisma.assetRequest.findUnique({
            where: { id },
            include: { asset: true, requestedBy: { select: { id: true, name: true } } },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (existing.status !== 'Pending') {
            throw new common_1.ConflictException(`Request already ${existing.status.toLowerCase()}`);
        }
        let assetUpdateNote = '';
        if (decision === 'Approved' && existing.asset) {
            if (existing.type === 'IssueReport') {
                await this.prisma.asset.update({
                    where: { id: existing.asset.id },
                    data: { status: 'Repair', condition: 'NeedsRepair' },
                });
                assetUpdateNote = ' The asset has been moved to Repair.';
            }
            else if (existing.type === 'Return') {
                await this.prisma.asset.update({
                    where: { id: existing.asset.id },
                    data: {
                        assignedToId: null,
                        status: 'Available',
                        allocationDate: null,
                        acknowledgedAt: null,
                    },
                });
                assetUpdateNote = ' The asset has been returned to inventory.';
            }
        }
        const updated = await this.prisma.assetRequest.update({
            where: { id },
            data: {
                status: decision,
                reviewedById: adminId,
                reviewedAt: new Date(),
                reviewNote,
            },
            include: {
                requestedBy: {
                    select: { id: true, name: true, employeeCode: true, department: true, email: true },
                },
                asset: { select: { id: true, name: true, assetTag: true, serialNumber: true, status: true } },
                reviewedBy: { select: { id: true, name: true } },
            },
        });
        const displayType = (0, asset_enums_1.fromPrismaRequestType)(existing.type);
        const displayCategory = existing.category ? (0, asset_enums_1.fromPrismaAssetCategory)(existing.category) : null;
        await this.notify.notifyUser({
            userId: existing.requestedBy.id,
            title: `Asset Request ${decision}`,
            message: `Your ${displayType === 'New Asset' ? 'new asset' : displayType === 'Issue Report' ? 'issue report' : 'return request'}` +
                ` (${existing.asset ? existing.asset.assetTag : (displayCategory ?? 'new asset')}) was ${decision.toLowerCase()}.` +
                (reviewNote ? ` Note: ${reviewNote}` : '') +
                assetUpdateNote,
            type: 'Asset',
            linkUrl: '/my-assets',
        });
        return (0, asset_enums_1.serializeAssetRequest)(updated);
    }
};
exports.AssetsService = AssetsService;
exports.AssetsService = AssetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notify_service_1.NotifyService])
], AssetsService);
//# sourceMappingURL=assets.service.js.map