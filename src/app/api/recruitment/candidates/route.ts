import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser, getCandidateFilterForUser } from '@/lib/recruitment/rbac-service';
import { createCandidate } from '@/lib/recruitment/candidate-service';
import type { CandidateStage, Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const stage = searchParams.get('stage');
    const query = searchParams.get('query');
    const source = searchParams.get('source');
    const tag = searchParams.get('tag');

    const baseFilter = getCandidateFilterForUser(user);
    const where: Prisma.RecruitmentCandidateWhereInput = {
      ...baseFilter,
      ...(jobId ? { jobId } : {}),
      ...(stage ? { stage: stage as CandidateStage } : {}),
      ...(source ? { source: source as any } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { currentRole: { contains: query, mode: 'insensitive' } },
              { location: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const candidates = await db.recruitmentCandidate.findMany({
      where,
      include: {
        job: { select: { id: true, title: true, department: true, location: true } },
        assignedRecruiter: { select: { id: true, name: true, email: true } },
        onboarding: {
          select: {
            id: true,
            stage: true,
            status: true,
            employee: { select: { employeeCode: true, id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching candidates:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch candidates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json();
    const candidate = await createCandidate(body, user);
    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating candidate:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create candidate' },
      { status: 400 }
    );
  }
}
