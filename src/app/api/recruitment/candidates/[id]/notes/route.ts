import { NextResponse } from 'next/server';
import { authAccessErrorResponse, isAuthAccessError } from '@/lib/auth-session';
import { requireRecruitmentUser } from '@/lib/recruitment/rbac-service';
import { addCandidateNote, getCandidateNotes } from '@/lib/recruitment/crm-service';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const notes = await getCandidateNotes(id, user);
    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching candidate notes:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch notes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await params;
    const body = await request.json();
    const { note } = body;

    if (!note || typeof note !== 'string') {
      return NextResponse.json({ success: false, error: 'Note text is required.' }, { status: 400 });
    }

    const created = await addCandidateNote(id, note, user);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error adding candidate note:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add note' },
      { status: 400 }
    );
  }
}
