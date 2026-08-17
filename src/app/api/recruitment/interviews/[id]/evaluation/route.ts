import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { getAuthenticatedRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { calculateConsolidatedEvaluation } from '@/lib/recruitment/evaluation-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;

    const evaluation = await calculateConsolidatedEvaluation(id, user);
    return NextResponse.json({ success: true, data: evaluation });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error calculating consolidated evaluation:', error);
    const message = error instanceof Error ? error.message : 'Failed to calculate evaluation';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
