import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { transitionCandidateStage } from '@/lib/recruitment/candidate-service';
import type { CandidateStage } from '@prisma/client';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();
    const { stage, note } = body;

    if (!stage) {
      return NextResponse.json({ success: false, error: 'Target stage is required.' }, { status: 400 });
    }

    const updated = await transitionCandidateStage(id, stage as CandidateStage, user, note);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error in candidate stage transition:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to transition stage' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return POST(request, { params });
}
