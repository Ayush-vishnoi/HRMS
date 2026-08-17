import { NextResponse } from 'next/server';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { addCandidateToNewJob } from '@/lib/recruitment/intelligence/rediscovery-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const body = await request.json().catch(() => ({}));
    const { targetJobId, notes } = body;

    if (!targetJobId) {
      return NextResponse.json({ error: 'Target Job ID is required.' }, { status: 400 });
    }

    const newCandidate = await addCandidateToNewJob(id, targetJobId, user, notes);

    return NextResponse.json({
      success: true,
      message: 'Candidate successfully added to the new requisition.',
      newCandidate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
