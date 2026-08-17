import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { getAuthenticatedRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { processCandidateSelectionDecision } from '@/lib/recruitment/evaluation-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;
    const body = await request.json();

    const result = await processCandidateSelectionDecision(
      {
        candidateId: id,
        decision: body.decision,
        reason: body.reason,
        interviewId: body.interviewId,
        overridePrerequisites: body.overridePrerequisites,
      },
      user
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing candidate selection decision:', error);
    const message = error instanceof Error ? error.message : 'Failed to process selection decision';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
