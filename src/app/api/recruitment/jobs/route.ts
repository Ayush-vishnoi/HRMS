import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser, getJobFilterForUser } from '@/lib/recruitment/rbac-service';
import { createJob } from '@/lib/recruitment/job-service';
import type { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const query = searchParams.get('query');

    const baseFilter = getJobFilterForUser(user);
    const where: Prisma.RecruitmentJobWhereInput = {
      ...baseFilter,
      ...(department ? { department } : {}),
      ...(status ? { status: status as any } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { department: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const jobs = await db.recruitmentJob.findMany({
      where,
      include: {
        hiringManager: { select: { id: true, name: true, email: true, roleTitle: true } },
        recruiter: { select: { id: true, name: true, email: true, roleTitle: true } },
        recruitment_job_approvals: {
          include: { employees: { select: { id: true, name: true, roleTitle: true } } },
          orderBy: { sequence: 'asc' },
        },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching jobs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json();
    const job = await createJob(body, user);
    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating job:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 400 }
    );
  }
}
