import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { updateCandidateTags } from '@/lib/recruitment/candidate-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    const candidate = await db.recruitmentCandidate.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            department: true,
            location: true,
            hiring_manager_id: true,
            recruiter_id: true,
            hiringManager: { select: { id: true, name: true, email: true } },
            recruiter: { select: { id: true, name: true, email: true } },
          },
        },
        assignedRecruiter: { select: { id: true, name: true, email: true } },
        onboarding: {
          select: {
            id: true,
            stage: true,
            status: true,
            employee: { select: { employeeCode: true, id: true, name: true } },
          },
        },
        candidate_stage_history: {
          include: { changedBy: { select: { id: true, name: true, roleTitle: true } } },
          orderBy: { changed_at: 'desc' },
        },
        candidate_notes: {
          include: { employees: { select: { id: true, name: true, roleTitle: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ success: false, error: 'Candidate not found' }, { status: 404 });
    }

    if (!canUserAccessJob(user, candidate.job)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching candidate:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch candidate' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();

    if (body.tags && Array.isArray(body.tags)) {
      const updated = await updateCandidateTags(id, body.tags, user);
      return NextResponse.json({ success: true, data: updated });
    }

    const candidate = await db.recruitmentCandidate.findUnique({
      where: { id },
      include: { job: true },
    });
    if (!candidate) return NextResponse.json({ success: false, error: 'Candidate not found' }, { status: 404 });
    if (!canUserAccessJob(user, candidate.job)) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

    const updated = await db.recruitmentCandidate.update({
      where: { id },
      data: {
        currentRole: body.currentRole,
        experience: body.experience,
        location: body.location,
        phone: body.phone,
        summary: body.summary,
        assigned_recruiter_id: body.assignedRecruiterId,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update candidate' },
      { status: 400 }
    );
  }
}
