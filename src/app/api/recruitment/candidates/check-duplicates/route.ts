import { NextResponse } from 'next/server';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { checkCandidateDuplicates } from '@/lib/recruitment/intelligence/duplicate-detector';

export async function POST(request: Request) {
  try {
    await requireRecruitmentUser();

    const body = await request.json().catch(() => ({}));
    const { email, phone, fileHash, linkedinUrl, name, excludeCandidateId } = body;

    if (!email && !phone && !fileHash && !name) {
      return NextResponse.json({
        hasDuplicates: false,
        duplicates: [],
        message: 'No identification fields provided for duplicate checking.',
      });
    }

    const result = await checkCandidateDuplicates({
      email,
      phone,
      fileHash,
      linkedinUrl,
      name,
      excludeCandidateId,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
