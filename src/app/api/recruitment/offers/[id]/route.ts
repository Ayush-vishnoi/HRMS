import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  getOfferById,
  updateOffer,
  type UpdateOfferInput,
} from '@/lib/recruitment/offer-service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    const offer = await getOfferById(id, user);
    return NextResponse.json({ success: true, data: offer });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch offer' },
      { status: 404 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();

    const input: UpdateOfferInput = {
      offeredTitle: body.offeredTitle,
      offeredCtc: body.offeredCtc !== undefined ? Number(body.offeredCtc) : undefined,
      currency: body.currency,
      proposedJoinDate: body.proposedJoinDate,
      expiresAt: body.expiresAt,
      templateId: body.templateId,
      variablePayAnnual: body.variablePayAnnual !== undefined ? Number(body.variablePayAnnual) : undefined,
      joiningBonus: body.joiningBonus !== undefined ? Number(body.joiningBonus) : undefined,
      retentionBonus: body.retentionBonus !== undefined ? Number(body.retentionBonus) : undefined,
    };

    const updated = await updateOffer(id, input, user);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update offer' },
      { status: 400 }
    );
  }
}
