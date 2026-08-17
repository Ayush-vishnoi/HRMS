import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { getCandidateTimeline } from '@/lib/recruitment/crm-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const timeline = await getCandidateTimeline(id, user);
    return NextResponse.json({ success: true, data: timeline });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching candidate timeline:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch timeline' },
      { status: 500 }
    );
  }
}
