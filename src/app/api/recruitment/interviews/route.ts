import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { getAuthenticatedRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { createInterview, getInterviews } from '@/lib/recruitment/interview-service';

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const { searchParams } = new URL(request.url);

    const candidateId = searchParams.get('candidateId') || undefined;
    const status = searchParams.get('status') || undefined;
    const roundParam = searchParams.get('round');
    const round = roundParam ? parseInt(roundParam, 10) : undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;
    const interviewerId = searchParams.get('interviewerId') || undefined;

    const interviews = await getInterviews(
      { candidateId, status, round, dateFrom, dateTo, interviewerId },
      user
    );

    return NextResponse.json({ success: true, data: interviews });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching interviews:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedRecruitmentUser();
    const body = await request.json();

    const createdInterview = await createInterview(body, user);
    return NextResponse.json({ success: true, data: createdInterview }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create interview' },
      { status: 400 }
    );
  }
}
