import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { getAuthenticatedRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { getInterviewById, updateInterview } from '@/lib/recruitment/interview-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;

    const interview = await getInterviewById(id, user);
    return NextResponse.json({ success: true, data: interview });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching interview:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch interview';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;
    const body = await request.json();

    const updated = await updateInterview(id, body, user);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating interview:', error);
    const message = error instanceof Error ? error.message : 'Failed to update interview';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
