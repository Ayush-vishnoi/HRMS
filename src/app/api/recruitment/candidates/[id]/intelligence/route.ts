import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { computeMatchScore } from '@/lib/recruitment/intelligence/match-engine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const candidate = await db.recruitmentCandidate.findUnique({
      where: { id },
      include: {
        job: true,
        resumeDocument: true,
        matches: {
          orderBy: { calculatedAt: 'desc' },
        },
        talent_pool_memberships: {
          include: { pool: true },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    if (!canUserAccessJob(user, candidate.job)) {
      return NextResponse.json({ error: 'Unauthorized to view this candidate intelligence.' }, { status: 403 });
    }

    // Get current job match
    let matchBreakdown = candidate.matches.find((m) => m.jobId === candidate.jobId);
    if (!matchBreakdown) {
      matchBreakdown = computeMatchScore(candidate, candidate.job) as any;
    }

    return NextResponse.json({
      candidateId: candidate.id,
      name: candidate.name,
      jobId: candidate.jobId,
      jobTitle: candidate.job.title,
      parsedResume: candidate.parsed_resume,
      resumeDocument: candidate.resumeDocument,
      matchBreakdown,
      allJobMatches: candidate.matches,
      talentPools: candidate.talent_pool_memberships.map((m) => ({
        poolId: m.poolId,
        poolName: m.pool.name,
        notes: m.notes,
        addedAt: m.addedAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
