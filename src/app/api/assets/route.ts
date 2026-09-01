import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';
import { notifyUser } from '@/lib/notifications/notify';
import { serializeAsset, toPrismaAssetCategory, toPrismaAssetCondition } from '@/lib/assets/asset-enums';

const formatDisplayDate = () =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export async function GET(_request: Request) {
  try {
    const employee = await requireEmployee();

    const assets = await db.asset.findMany({
      where: employee.userRole === 'admin' ? undefined : { assignedToId: employee.id },
      orderBy: { id: 'asc' },
      include: {
        assignedTo: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });
    return NextResponse.json({ success: true, data: assets.map(serializeAsset) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching assets:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const count = await db.asset.count();
    const newId = `AST-${String(count + 1).padStart(3, '0')}`;
    const assetTag = `APX-${(body.category || 'LT').slice(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAsset = await db.asset.create({
      data: {
        id: body.id || newId,
        assetTag: body.assetTag || assetTag,
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
        assignedTo: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });

    if (newAsset.assignedToId) {
      await notifyUser({
        userId: newAsset.assignedToId,
        title: 'New Asset Assigned',
        message: `A ${newAsset.name} (${newAsset.assetTag}) has been assigned to you. Please confirm receipt in My Assets.`,
        type: 'Asset',
        linkUrl: '/my-assets',
      });
    }

    return NextResponse.json({ success: true, data: serializeAsset(newAsset) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to create asset' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const { id } = body;

    const existing = await db.asset.findUnique({ where: { id }, select: { id: true, assignedToId: true } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }

    const assigneeChanged =
      body.assignedToId !== undefined && (body.assignedToId || null) !== existing.assignedToId;
    const nowAssigned = assigneeChanged ? body.assignedToId || null : existing.assignedToId;

    const updated = await db.asset.update({
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
        ...(body.condition !== undefined ? { condition: toPrismaAssetCondition(body.condition) } : {}),
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
        assignedTo: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });

    if (updated.assignedToId) {
      await notifyUser({
        userId: updated.assignedToId,
        title: assigneeChanged ? 'Asset Assigned' : 'Asset Update',
        message: assigneeChanged
          ? `A ${updated.name} (${updated.assetTag}) has been assigned to you. Please confirm receipt in My Assets.`
          : `Your assigned asset ${updated.name} (${updated.assetTag}) was updated by admin.`,
        type: 'Asset',
        linkUrl: '/my-assets',
      });
    }

    return NextResponse.json({ success: true, data: serializeAsset(updated) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Asset id is required' }, { status: 400 });
    }

    await db.asset.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Asset not found' }, { status: 404 });
    }
    console.error('Error deleting asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete asset' }, { status: 500 });
  }
}
