import { NextResponse } from 'next/server';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import {
  listRecruitmentTalentPools,
  createRecruitmentTalentPool,
  addCandidateToTalentPool,
} from '@/lib/recruitment/intelligence/rediscovery-service';

export async function GET() {
  try {
    await requireRecruitmentUser();
    const pools = await listRecruitmentTalentPools();
    return NextResponse.json({ talentPools: pools });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireRecruitmentUser();
    const body = await request.json().catch(() => ({}));

    // Add candidate to pool action
    if (body.action === 'ADD_MEMBER') {
      const { poolId, candidateId, notes } = body;
      if (!poolId || !candidateId) {
        return NextResponse.json({ error: 'Pool ID and Candidate ID are required.' }, { status: 400 });
      }
      const membership = await addCandidateToTalentPool(poolId, candidateId, notes, user);
      return NextResponse.json({ success: true, membership });
    }

    // Create pool action
    const { name, description, tags } = body;
    if (!name) {
      return NextResponse.json({ error: 'Talent Pool name is required.' }, { status: 400 });
    }

    const pool = await createRecruitmentTalentPool(name, description, tags, user);
    return NextResponse.json({ success: true, talentPool: pool });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
