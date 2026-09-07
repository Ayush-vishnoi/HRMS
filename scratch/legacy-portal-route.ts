import { NextRequest, NextResponse } from 'next/server';
import { requireCandidateSession, CandidateAuthError } from '@/lib/auth/candidate-session';
import { getCandidatePortalSummary } from '@/lib/recruitment/candidate-portal-service';

export async function GET(req: NextRequest) {
  try {
    const session = await requireCandidateSession(req);
    const summary = await getCandidatePortalSummary(session.candidateId);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    console.error('Error fetching candidate portal summary:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch portal summary.' },
      { status: 500 }
    );
  }
}
