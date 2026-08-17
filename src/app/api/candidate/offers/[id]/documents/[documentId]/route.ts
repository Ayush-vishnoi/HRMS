import { NextRequest, NextResponse } from 'next/server';
import { requireCandidateSession, CandidateAuthError } from '@/lib/auth/candidate-session';
import { getCandidateDocumentFile } from '@/lib/recruitment/candidate-portal-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await requireCandidateSession(req);
    const { id: offerId, documentId } = await params;

    const { fileBuffer, fileName, contentType } = await getCandidateDocumentFile(
      session.candidateId,
      offerId,
      documentId
    );

    const uint8 = new Uint8Array(fileBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': uint8.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof CandidateAuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
    const status = error.message?.includes('authorization') ? 403 : error.message?.includes('not found') ? 404 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to download document.' },
      { status }
    );
  }
}
