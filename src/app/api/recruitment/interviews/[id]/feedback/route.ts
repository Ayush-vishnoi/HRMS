import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { getAuthenticatedRecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  getInterviewFeedback,
  submitInterviewFeedback,
} from '@/lib/recruitment/evaluation-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;

    const data = await getInterviewFeedback(id, user);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching interview feedback:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch interview feedback';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { id } = await params;
    const body = await request.json();

    const createdFeedback = await submitInterviewFeedback(id, body, user);
    return NextResponse.json({ success: true, data: createdFeedback }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error submitting interview feedback:', error);
    const message = error instanceof Error ? error.message : 'Failed to submit feedback';
    const status = message.includes('Not authorized') ? 403 : message.includes('not found') ? 404 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
