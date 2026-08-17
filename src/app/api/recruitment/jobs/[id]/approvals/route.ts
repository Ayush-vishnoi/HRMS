import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { processJobApproval } from '@/lib/recruitment/job-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();
    const { action, note } = body;

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Valid action (APPROVE, REJECT, REQUEST_CHANGES) is required.' },
        { status: 400 }
      );
    }

    const result = await processJobApproval(id, user, { action, note });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error processing job approval:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process job approval' },
      { status: 400 }
    );
  }
}
