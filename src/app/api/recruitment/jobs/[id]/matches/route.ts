import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { calculateAndPersistMatch } from '@/lib/recruitment/intelligence/match-engine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const job = await db.recruitmentJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job requisition not found.' }, { status: 404 });
    }

    if (!canUserAccessJob(user, job)) {
      return NextResponse.json({ error: 'Unauthorized to access this job.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'matchScore'; // 'matchScore' | 'experience' | 'newest'
    const stage = searchParams.get('stage');

    const candidates = await db.recruitmentCandidate.findMany({
      where: {
        jobId: id,
        ...(stage && stage !== 'All' ? { stage: stage as any } : {}),
      },
      include: {
        matches: {
          where: { jobId: id },
        },
        resumeDocument: {
          select: { parsingStatus: true, fileName: true, fileType: true },
        },
      },
    });

    const ranked = candidates.map((c) => {
      const match = c.matches[0];
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        stage: c.stage,
        score: c.score,
        experience: c.experience,
        currentRole: c.currentRole,
        location: c.location,
        matchedSkills: c.matchedSkills,
        missingSkills: c.missingSkills,
        recommendation: c.recommendation,
        tags: c.tags,
        appliedOn: c.appliedOn,
        createdAt: c.createdAt,
        resumeStatus: c.resumeDocument?.parsingStatus || 'NO_RESUME',
        matchBreakdown: match || null,
      };
    });

    if (sortBy === 'matchScore') {
      ranked.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'newest') {
      ranked.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'experience') {
      const parseExp = (e: string) => {
        const m = e.match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
      };
      ranked.sort((a, b) => parseExp(b.experience) - parseExp(a.experience));
    }

    return NextResponse.json({
      jobId: job.id,
      jobTitle: job.title,
      totalCandidates: ranked.length,
      candidates: ranked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const job = await db.recruitmentJob.findUnique({
      where: { id },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job requisition not found.' }, { status: 404 });
    }

    if (!canUserAccessJob(user, job)) {
      return NextResponse.json({ error: 'Unauthorized to manage this job.' }, { status: 403 });
    }

    const candidates = await db.recruitmentCandidate.findMany({
      where: { jobId: id },
      select: { id: true },
    });

    const updatedMatches = [];
    for (const c of candidates) {
      const match = await calculateAndPersistMatch(c.id, id);
      updatedMatches.push({ candidateId: c.id, matchScore: match.overallScore });
    }

    return NextResponse.json({
      success: true,
      jobId: id,
      recalculatedCount: updatedMatches.length,
      matches: updatedMatches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
