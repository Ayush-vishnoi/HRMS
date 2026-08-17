import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import {
  requireRecruitmentUser,
  getJobFilterForUser,
  getCandidateFilterForUser,
} from '@/lib/recruitment/rbac-service';
import { createJob } from '@/lib/recruitment/job-service';
import { transitionCandidateStage } from '@/lib/recruitment/candidate-service';
import type { CandidateStage } from '@prisma/client';

export async function GET() {
  try {
    const user = await requireRecruitmentUser();

    const [jobs, candidates] = await Promise.all([
      db.recruitmentJob.findMany({
        where: getJobFilterForUser(user),
        include: {
          hiringManager: { select: { id: true, name: true, email: true, employeeCode: true } },
          recruiter: { select: { id: true, name: true, email: true, employeeCode: true } },
          recruitment_job_approvals: {
            include: {
              employees: { select: { id: true, name: true, roleTitle: true } },
            },
            orderBy: { sequence: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.recruitmentCandidate.findMany({
        where: getCandidateFilterForUser(user),
        include: {
          assignedRecruiter: { select: { id: true, name: true, email: true } },
          onboarding: {
            select: {
              id: true,
              stage: true,
              status: true,
              employee: {
                select: { employeeCode: true, id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { jobs, candidates, currentUserRole: user.userRole, currentUserId: user.id },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching recruitment data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recruitment data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json();

    const newJob = await createJob(body, user);
    return NextResponse.json({ success: true, data: newJob });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json();
    const { candidateId, stage, note } = body;

    if (!candidateId || !stage) {
      return NextResponse.json(
        { success: false, error: 'Candidate ID and target stage are required.' },
        { status: 400 }
      );
    }

    const updated = await transitionCandidateStage(candidateId, stage as CandidateStage, user, note);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating candidate stage:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update candidate stage' },
      { status: 400 }
    );
  }
}
