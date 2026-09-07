import { NextRequest, NextResponse } from 'next/server';
import { requireCandidateSession, CandidateAuthError } from '@/lib/auth/candidate-session';
import { rejectCandidateOffer } from '@/lib/recruitment/candidate-portal-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCandidateSession(req);
    const { id: offerId } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await rejectCandidateOffer(session.candidateId, offerId, body);

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const status = error.message?.includes('authorization') ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to decline offer.' },
      { status }
    );
  }
}
