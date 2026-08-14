import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireRole,
} from '@/lib/auth-session';

export async function GET() {
  try {
    await requireRole('admin');
    const [jobs, candidates] = await Promise.all([
      db.recruitmentJob.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      db.recruitmentCandidate.findMany({
        include: {
          onboarding: {
            select: {
              employee: {
                select: { employeeCode: true },
              },
            },
          },
        },
        orderBy: { appliedOn: 'desc' },
      }),
    ]);
    return NextResponse.json({ success: true, data: { jobs, candidates } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching recruitment data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch recruitment data' }, { status: 500 });
  }
}

const mapEmploymentType = (type?: string): 'FullTime' | 'Contract' => {
  if (!type) return 'FullTime';
  const clean = type.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('contract')) return 'Contract';
  return 'FullTime';
};

export async function POST(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const count = await db.recruitmentJob.count();
    const newId = `JOB-${String(count + 1).padStart(3, '0')}`;

    const newJob = await db.recruitmentJob.create({
      data: {
        id: body.id || newId,
        title: body.title,
        department: body.department,
        location: body.location,
        employmentType: mapEmploymentType(body.employmentType),
        openings: Number(body.openings) || 1,
        status: body.status || 'Open',
        postedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        description: body.description,
        requirements: Array.isArray(body.requirements) ? body.requirements : (body.requirements || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      },
    });

    return NextResponse.json({ success: true, data: newJob });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating job:', error);
    return NextResponse.json({ success: false, error: 'Failed to create job' }, { status: 500 });
  }
}


export async function PATCH(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const { candidateId, stage } = body;

    const updated = await db.recruitmentCandidate.update({
      where: { id: candidateId },
      data: { stage },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating candidate stage:', error);
    return NextResponse.json({ success: false, error: 'Failed to update candidate stage' }, { status: 500 });
  }
}
