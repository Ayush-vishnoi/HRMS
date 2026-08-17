import { NextRequest, NextResponse } from 'next/server';
import { requireCandidateSession, CandidateAuthError } from '@/lib/auth/candidate-session';
import {
  getOrCreateSignatureRequest,
  completeCandidateSignature,
} from '@/lib/documents/signature-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCandidateSession(req);
    const { id: offerId } = await params;

    const summary = await getOrCreateSignatureRequest(offerId, session.candidateId);

    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const status = error.message?.includes('authorization') ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch signature status.' },
      { status }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireCandidateSession(req);
    const { id: offerId } = await params;
    const body = await req.json().catch(() => ({}));

    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'CandidatePortal/1.0';

    const result = await completeCandidateSignature(offerId, session.candidateId, {
      ...body,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const status = error.message?.includes('authorization') ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit electronic signature.' },
      { status }
    );
  }
}
