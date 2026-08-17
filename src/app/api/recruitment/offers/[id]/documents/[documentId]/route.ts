import { NextResponse } from 'next/server';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { getDocumentFile } from '@/lib/documents/offer-document-service';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const sessionUser = await requireEmployee();
    const params = await props.params;
    const { id: offerId, documentId } = params;

    const user: RecruitmentUser = {
      id: sessionUser.id,
      userRole: sessionUser.userRole,
      department: sessionUser.department,
      name: sessionUser.name,
      email: sessionUser.email,
    };

    const { fileBuffer, fileName, mimeType } = await getDocumentFile(
      offerId,
      documentId,
      user
    );

    return new Response(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeType || 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error downloading offer document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to download document.' },
      { status: error.status || 500 }
    );
  }
}
