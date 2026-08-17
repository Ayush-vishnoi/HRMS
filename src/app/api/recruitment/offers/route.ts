import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  createOffer,
  getOffers,
  type CreateOfferInput,
  type OfferFilterParams,
} from '@/lib/recruitment/offer-service';

export async function GET(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const { searchParams } = new URL(request.url);

    const filters: OfferFilterParams = {
      candidateId: searchParams.get('candidateId') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      recruiterId: searchParams.get('recruiterId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const offers = await getOffers(filters, user);
    return NextResponse.json({ success: true, data: offers });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch offers' },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json();

    const input: CreateOfferInput = {
      candidateId: body.candidateId,
      offeredTitle: body.offeredTitle,
      offeredCtc: Number(body.offeredCtc),
      currency: body.currency,
      proposedJoinDate: body.proposedJoinDate,
      expiresAt: body.expiresAt,
      templateId: body.templateId,
      variablePayAnnual: body.variablePayAnnual ? Number(body.variablePayAnnual) : undefined,
      joiningBonus: body.joiningBonus ? Number(body.joiningBonus) : undefined,
      retentionBonus: body.retentionBonus ? Number(body.retentionBonus) : undefined,
    };

    const offer = await createOffer(input, user);
    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create offer' },
      { status: 400 }
    );
  }
}
