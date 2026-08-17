import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import {
  submitJobForApproval,
  publishJob,
  updateJobLifecycleStatus,
} from '@/lib/recruitment/job-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;

    const job = await db.recruitmentJob.findUnique({
      where: { id },
      include: {
        hiringManager: { select: { id: true, name: true, email: true, roleTitle: true } },
        recruiter: { select: { id: true, name: true, email: true, roleTitle: true } },
        recruitment_job_approvals: {
          include: { employees: { select: { id: true, name: true, roleTitle: true } } },
          orderBy: { sequence: 'asc' },
        },
        candidates: {
          select: {
            id: true,
            name: true,
            email: true,
            stage: true,
            score: true,
            appliedOn: true,
            tags: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    if (!canUserAccessJob(user, job)) {
      return NextResponse.json({ success: false, error: 'Access denied to this job requisition' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching job:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch job' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();
    const { action, note, approverId } = body;

    let result;
    if (action === 'submit_approval') {
      result = await submitJobForApproval(id, user, { approverId, note });
    } else if (action === 'publish') {
      result = await publishJob(id, user);
    } else if (action === 'hold') {
      result = await updateJobLifecycleStatus(id, 'OnHold', user);
    } else if (action === 'close') {
      result = await updateJobLifecycleStatus(id, 'Closed', user);
    } else {
      // General update
      const job = await db.recruitmentJob.findUnique({ where: { id } });
      if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
      if (!canUserAccessJob(user, job)) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }

      result = await db.recruitmentJob.update({
        where: { id },
        data: {
          title: body.title,
          department: body.department,
          location: body.location,
          openings: body.openings ? Number(body.openings) : undefined,
          priority: body.priority,
          description: body.description,
          experience_min: body.experienceMin !== undefined ? Number(body.experienceMin) : undefined,
          experience_max: body.experienceMax !== undefined ? Number(body.experienceMax) : undefined,
          hiring_manager_id: body.hiringManagerId,
          recruiter_id: body.recruiterId,
          target_close_date: body.targetCloseDate ? new Date(body.targetCloseDate) : undefined,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating job:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update job' },
      { status: 400 }
    );
  }
}
