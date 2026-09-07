import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotifyService } from '../common/notifications/notify.service';
import {
  fromPrismaAssetCategory,
  fromPrismaRequestType,
  serializeAsset,
  serializeAssetRequest,
  toPrismaAssetCategory,
  toPrismaAssetCondition,
  toPrismaRequestType,
} from './asset-enums';

const ASSET_CATEGORIES = ['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'];
const URGENCY_LEVELS = ['Low', 'Medium', 'High'];

const formatDisplayDate = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private notify: NotifyService,
  ) {}

  async findAll(employeeId?: string, isAdmin = false) {
    const assets = await this.prisma.asset.findMany({
      where: isAdmin ? undefined : { assignedToId: employeeId },
      orderBy: { id: 'asc' },
      include: {
        assignedTo: { select: { id: true, name: true, employeeCode: true, department: true } },
      },
    });
    return assets.map(serializeAsset);
  }

  async create(body: any) {
    const count = await this.prisma.asset.count();
    const newAsset = await this.prisma.asset.create({
      data: {
        id: body.id || `AST-${String(count + 1).padStart(3, '0')}`,
        assetTag:
          body.assetTag ||
          `APX-${(body.category || 'LT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        category: toPrismaAssetCategory(body.category || 'Other'),
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
        condition: body.condition ? toPrismaAssetCondition(body.condition) : 'Good',
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

    return serializeAsset(newAsset);
  }

  async update(id: string, body: any) {
    const existing = await this.prisma.asset.findUnique({
      where: { id },
      select: { id: true, assignedToId: true },
    });
    if (!existing) {
      throw new NotFoundException('Asset not found');
    }

    const assigneeChanged =
      body.assignedToId !== undefined && (body.assignedToId || null) !== existing.assignedToId;
    const nowAssigned = assigneeChanged ? body.assignedToId || null : existing.assignedToId;

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...(body.assetTag !== undefined ? { assetTag: body.assetTag } : {}),
        ...(body.category !== undefined ? { category: toPrismaAssetCategory(body.category) } : {}),
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
          ? { condition: toPrismaAssetCondition(body.condition) }
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

    return serializeAsset(updated);
  }

  async remove(id: string) {
    await this.prisma.asset.delete({ where: { id } });
    return { id };
  }

  /** GET /api/my-assets — the employee's assigned assets + their own asset requests. */
  async findMyAssets(employeeId: string) {
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
      assets: assets.map(serializeAsset),
      requests: requests.map(serializeAssetRequest),
    };
  }

  /**
   * POST /api/my-assets action='acknowledge' — employee confirms receipt of an asset.
   */
  async acknowledgeAsset(employeeId: string, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, assignedToId: employeeId },
      select: { id: true, name: true, assetTag: true, acknowledgedAt: true },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
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

  /**
   * POST /api/my-assets action='request' — employee creates an AssetRequest.
   * type: 'New Asset' | 'Issue Report' | 'Return'
   */
  async createAssetRequest(employee: { id: string; name: string }, body: any) {
    const type = body?.type as 'New Asset' | 'Issue Report' | 'Return';
    if (!['New Asset', 'Issue Report', 'Return'].includes(type)) {
      throw new BadRequestException('Invalid request type');
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!reason || reason.length < 5) {
      throw new BadRequestException('Please describe your reason (min 5 characters)');
    }
    if (reason.length > 500) {
      throw new BadRequestException('Reason is too long (max 500 characters)');
    }

    let asset: { id: string; name: string; assetTag: string } | null = null;
    if (type !== 'New Asset') {
      asset = await this.prisma.asset.findFirst({
        where: { id: body.assetId, assignedToId: employee.id },
        select: { id: true, name: true, assetTag: true },
      });
      if (!asset) {
        throw new BadRequestException('Select one of your assigned assets');
      }
    }

    let category: string | undefined;
    if (type === 'New Asset') {
      category = body.category;
      if (!category || !ASSET_CATEGORIES.includes(category)) {
        throw new BadRequestException('Select a valid asset category');
      }
    }

    let urgency: string | undefined;
    if (type === 'Issue Report') {
      urgency = body.urgency;
      if (!urgency || !URGENCY_LEVELS.includes(urgency)) {
        throw new BadRequestException('Select an urgency level');
      }
    }

    const count = await this.prisma.assetRequest.count();
    const id = `AR-${String(count + 1).padStart(3, '0')}`;

    const created = await this.prisma.assetRequest.create({
      data: {
        id,
        type: toPrismaRequestType(type),
        requestedById: employee.id,
        assetId: asset?.id ?? null,
        category: category ? toPrismaAssetCategory(category) : null,
        reason,
        urgency: (urgency as any) ?? null,
      },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    });

    await this.notify.notifyAdmins({
      title: 'New Asset Request',
      message:
        type === 'New Asset'
          ? `${employee.name} requested a new asset (${category}).`
          : type === 'Issue Report'
            ? `${employee.name} reported an issue on ${asset?.name ?? 'an asset'} (${urgency} urgency).`
            : `${employee.name} requested return of ${asset?.name ?? 'an asset'}.`,
      type: 'Asset',
      linkUrl: '/assets?tab=requests',
    });

    return serializeAssetRequest(created);
  }

  /** GET /api/asset-requests — HR queue of all employee asset requests. */
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

    return { requests: requests.map(serializeAssetRequest) };
  }

  /**
   * PATCH /api/asset-requests — HR approves/rejects a request.
   *
   * Approve semantics:
   *  - New Asset: request closes as Approved; HR fulfils via the existing Assign flow.
   *  - Issue Report: asset flagged for attention — status 'Repair', condition 'NeedsRepair'.
   *  - Return: asset returned to inventory — assignee cleared, status 'Available',
   *    allocation/acknowledgement reset.
   */
  async reviewAssetRequest(adminId: string, body: any) {
    const id = body?.id;
    const decision = body?.decision as 'Approved' | 'Rejected';

    if (!id || !['Approved', 'Rejected'].includes(decision)) {
      throw new BadRequestException('Provide id and decision (Approved/Rejected)');
    }
    const reviewNote =
      typeof body.reviewNote === 'string' && body.reviewNote.trim()
        ? body.reviewNote.trim().slice(0, 500)
        : null;

    const existing = await this.prisma.assetRequest.findUnique({
      where: { id },
      include: { asset: true, requestedBy: { select: { id: true, name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Request not found');
    }
    if (existing.status !== 'Pending') {
      throw new ConflictException(`Request already ${existing.status.toLowerCase()}`);
    }

    let assetUpdateNote = '';
    if (decision === 'Approved' && existing.asset) {
      if (existing.type === 'IssueReport') {
        await this.prisma.asset.update({
          where: { id: existing.asset.id },
          data: { status: 'Repair', condition: 'NeedsRepair' },
        });
        assetUpdateNote = ' The asset has been moved to Repair.';
      } else if (existing.type === 'Return') {
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

    const displayType = fromPrismaRequestType(existing.type);
    const displayCategory = existing.category ? fromPrismaAssetCategory(existing.category) : null;
    await this.notify.notifyUser({
      userId: existing.requestedBy.id,
      title: `Asset Request ${decision}`,
      message:
        `Your ${displayType === 'New Asset' ? 'new asset' : displayType === 'Issue Report' ? 'issue report' : 'return request'}` +
        ` (${existing.asset ? existing.asset.assetTag : (displayCategory ?? 'new asset')}) was ${decision.toLowerCase()}.` +
        (reviewNote ? ` Note: ${reviewNote}` : '') +
        assetUpdateNote,
      type: 'Asset',
      linkUrl: '/my-assets',
    });

    return serializeAssetRequest(updated);
  }
}
