import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';
import { notifyUser } from '@/lib/notifications/notify';
import { fromPrismaAssetCategory, fromPrismaRequestType, serializeAssetRequest } from '@/lib/assets/asset-enums';

/** GET /api/asset-requests — HR queue of all employee asset requests. */
export async function GET() {
  try {
    await requireRole('admin');

    const requests = await db.assetRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        requestedBy: {
          select: { id: true, name: true, employeeCode: true, department: true, email: true },
        },
        asset: { select: { id: true, name: true, assetTag: true, serialNumber: true, status: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: { requests: requests.map(serializeAssetRequest) } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching asset requests:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch asset requests' }, { status: 500 });
  }
}

/**
 * PATCH /api/asset-requests — HR approves/rejects a request.
 * Body: { id, decision: 'Approved' | 'Rejected', reviewNote? }
 *
 * Approve semantics (asset changes stay with HR via existing flows):
 *  - New Asset: request closes as Approved; HR fulfils via the existing Assign flow.
 *  - Issue Report: asset is flagged for attention — status set to 'Repair' so it shows
 *    in HR's Repair filter; HR can adjust via Manage.
 *  - Return: asset is returned to inventory — assignee cleared, status 'Available',
 *    allocation/acknowledgement reset. HR is notified to inspect via Manage.
 */
export async function PATCH(request: Request) {
  try {
    const admin = await requireRole('admin');
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const decision = body?.decision;

    if (!id || !['Approved', 'Rejected'].includes(decision)) {
      return NextResponse.json({ success: false, error: 'Provide id and decision (Approved/Rejected)' }, { status: 400 });
    }
    const reviewNote = typeof body.reviewNote === 'string' && body.reviewNote.trim() ? body.reviewNote.trim().slice(0, 500) : null;

    const existing = await db.assetRequest.findUnique({
      where: { id },
      include: { asset: true, requestedBy: { select: { id: true, name: true } } },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }
    if (existing.status !== 'Pending') {
      return NextResponse.json({ success: false, error: `Request already ${existing.status.toLowerCase()}` }, { status: 409 });
    }

    let assetUpdateNote = '';
    if (decision === 'Approved' && existing.asset) {
      if (existing.type === 'IssueReport') {
        await db.asset.update({
          where: { id: existing.asset.id },
          data: { status: 'Repair', condition: 'NeedsRepair' },
        });
        assetUpdateNote = ' The asset has been moved to Repair.';
      } else if (existing.type === 'Return') {
        await db.asset.update({
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

    const updated = await db.assetRequest.update({
      where: { id },
      data: {
        status: decision,
        reviewedById: admin.id,
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
    await notifyUser({
      userId: existing.requestedBy.id,
      title: `Asset Request ${decision}`,
      message:
        `Your ${displayType === 'New Asset' ? 'new asset' : displayType === 'Issue Report' ? 'issue report' : 'return request'}` +
        ` (${existing.asset ? existing.asset.assetTag : displayCategory ?? 'new asset'}) was ${decision.toLowerCase()}.` +
        (reviewNote ? ` Note: ${reviewNote}` : '') +
        assetUpdateNote,
      type: 'Asset',
      linkUrl: '/my-assets',
    });

    return NextResponse.json({ success: true, data: serializeAssetRequest(updated) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error reviewing asset request:', error);
    return NextResponse.json({ success: false, error: 'Failed to review request' }, { status: 500 });
  }
}
