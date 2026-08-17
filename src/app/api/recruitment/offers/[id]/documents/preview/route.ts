import { NextResponse } from 'next/server';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { previewOfferDocument } from '@/lib/documents/offer-document-service';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await requireEmployee();
    const params = await props.params;
    const offerId = params.id;

    const user: RecruitmentUser = {
      id: sessionUser.id,
      userRole: sessionUser.userRole,
      department: sessionUser.department,
      name: sessionUser.name,
      email: sessionUser.email,
    };

    const body = await request.json();
    const { documentType, templateId } = body;

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type is required for preview.' },
        { status: 400 }
      );
    }

    const previewResult = await previewOfferDocument(
      offerId,
      { documentType, templateId },
      user
    );

    return NextResponse.json({
      success: true,
      preview: previewResult,
    });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error previewing offer document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to preview offer document.' },
      { status: error.status || 500 }
    );
  }
}
