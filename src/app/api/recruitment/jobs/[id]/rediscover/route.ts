import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { rediscoverCandidatesForJob } from '@/lib/recruitment/intelligence/rediscovery-service';

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
    const minScore = searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : 50;

    const candidates = await rediscoverCandidatesForJob(id, user, { minScore });

    return NextResponse.json({
      jobId: job.id,
      jobTitle: job.title,
      rediscoveredCandidates: candidates,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
