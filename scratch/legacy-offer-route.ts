import { NextRequest, NextResponse } from 'next/server';
import { requireCandidateSession, CandidateAuthError } from '@/lib/auth/candidate-session';
import { getCandidateOffer } from '@/lib/recruitment/candidate-portal-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCandidateSession(req);
    const { id: offerId } = await params;

    const offer = await getCandidateOffer(session.candidateId, offerId);

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const status = error.message?.includes('authorization') ? 403 : error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch offer.' },
      { status }
    );
  }
}
