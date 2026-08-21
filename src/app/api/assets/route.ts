import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';

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
    return NextResponse.json({ success: true, data: assets });
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
        category: body.category,
        name: body.name,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        purchaseDate: body.purchaseDate || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        purchaseCost: body.purchaseCost || null,
        warrantyUntil: body.warrantyUntil || null,
        status: body.status || 'Available',
        assignedToId: body.assignedToId || null,
        location: body.location || 'Bengaluru Office',
        condition: body.condition || 'Good',
        lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        notes: body.notes || null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: newAsset });
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

    const updated = await db.asset.update({
      where: { id },
      data: {
        ...(body.assetTag !== undefined ? { assetTag: body.assetTag } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
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
        ...(body.condition !== undefined ? { condition: body.condition } : {}),
        ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
        lastChecked: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, employeeCode: true, department: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating asset:', error);
    return NextResponse.json({ success: false, error: 'Failed to update asset' }, { status: 500 });
  }
}
