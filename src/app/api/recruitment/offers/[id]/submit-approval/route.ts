import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { submitOfferForApproval } from '@/lib/recruitment/offer-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const result = await submitOfferForApproval(id, user, {
      approverIds: body?.approverIds,
      note: body?.note,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error submitting offer for approval:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit offer for approval',
      },
      { status: 400 }
    );
  }
}
