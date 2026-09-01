import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { notifyAdmins } from '@/lib/notifications/notify';
import {
  serializeAsset,
  serializeAssetRequest,
  toPrismaAssetCategory,
  toPrismaRequestType,
} from '@/lib/assets/asset-enums';

const ASSET_CATEGORIES = ['Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other'] as const;
const URGENCY_LEVELS = ['Low', 'Medium', 'High'] as const;

type AssetRequestTypeValue = 'New Asset' | 'Issue Report' | 'Return';

/** GET /api/my-assets — the employee's assigned assets + their own asset requests. */
export async function GET() {
  try {
    const employee = await requireEmployee();

    const [assets, requests] = await Promise.all([
      db.asset.findMany({
        where: { assignedToId: employee.id },
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
      db.assetRequest.findMany({
        where: { requestedById: employee.id },
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { assets: assets.map(serializeAsset), requests: requests.map(serializeAssetRequest) },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching my assets:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 });
  }
}

/**
 * POST /api/my-assets
 * action: 'acknowledge' | 'request'
 *  - acknowledge: { action, assetId } → sets acknowledgedAt (Confirm Receipt)
 *  - request:    { action, type, assetId?, category?, reason, urgency? } → creates AssetRequest
 */
export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (body.action === 'acknowledge') {
      const asset = await db.asset.findFirst({
        where: { id: body.assetId, assignedToId: employee.id },
        select: { id: true, name: true, assetTag: true, acknowledgedAt: true },
      });
      if (!asset) {
        return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
      }
      if (asset.acknowledgedAt) {
        return NextResponse.json({ success: true, data: { assetId: asset.id, alreadyAcknowledged: true } });
      }

      const updated = await db.asset.update({
        where: { id: asset.id },
        data: { acknowledgedAt: new Date() },
        select: { id: true, acknowledgedAt: true },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (body.action === 'request') {
      const type = body.type as AssetRequestTypeValue;
      if (!['New Asset', 'Issue Report', 'Return'].includes(type)) {
        return NextResponse.json({ success: false, error: 'Invalid request type' }, { status: 400 });
      }
      const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
      if (!reason || reason.length < 5) {
        return NextResponse.json({ success: false, error: 'Please describe your reason (min 5 characters)' }, { status: 400 });
      }
      if (reason.length > 500) {
        return NextResponse.json({ success: false, error: 'Reason is too long (max 500 characters)' }, { status: 400 });
      }

      let asset = null;
      if (type !== 'New Asset') {
        asset = await db.asset.findFirst({
          where: { id: body.assetId, assignedToId: employee.id },
          select: { id: true, name: true, assetTag: true },
        });
        if (!asset) {
          return NextResponse.json({ success: false, error: 'Select one of your assigned assets' }, { status: 400 });
        }
      }

      let category: (typeof ASSET_CATEGORIES)[number] | undefined;
      if (type === 'New Asset') {
        category = body.category;
        if (!category || !ASSET_CATEGORIES.includes(category)) {
          return NextResponse.json({ success: false, error: 'Select a valid asset category' }, { status: 400 });
        }
      }

      let urgency: (typeof URGENCY_LEVELS)[number] | undefined;
      if (type === 'Issue Report') {
        urgency = body.urgency;
        if (!urgency || !URGENCY_LEVELS.includes(urgency)) {
          return NextResponse.json({ success: false, error: 'Select an urgency level' }, { status: 400 });
        }
      }

      const count = await db.assetRequest.count();
      const id = `AR-${String(count + 1).padStart(3, '0')}`;

      const created = await db.assetRequest.create({
        data: {
          id,
          type: toPrismaRequestType(type),
          requestedById: employee.id,
          assetId: asset?.id ?? null,
          category: category ? toPrismaAssetCategory(category) : null,
          reason,
          urgency: urgency ?? null,
        },
        include: {
          asset: { select: { id: true, name: true, assetTag: true } },
        },
      });

      await notifyAdmins({
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

      return NextResponse.json({ success: true, data: serializeAssetRequest(created) });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing my-assets action:', error);
    return NextResponse.json({ success: false, error: 'Failed to process request' }, { status: 500 });
  }
}
