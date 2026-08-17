import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  getOfferApprovals,
  processOfferApprovalAction,
} from '@/lib/recruitment/offer-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    const approvals = await getOfferApprovals(id, user);
    return NextResponse.json({ success: true, data: approvals });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching offer approvals:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch offer approvals',
      },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    const body = await request.json();
    const { action, comment } = body;

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid action (APPROVE, REJECT, REQUEST_CHANGES) is required.',
        },
        { status: 400 }
      );
    }

    const result = await processOfferApprovalAction(
      id,
      { action, comment },
      user
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing offer approval action:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process offer approval action',
      },
      { status: 400 }
    );
  }
}
