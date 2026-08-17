import { NextResponse } from 'next/server';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import {
  getOfferDocuments,
  generateOfferDocument,
  getAvailableDocumentTemplates,
} from '@/lib/documents/offer-document-service';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';

export async function GET(
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

    const documents = await getOfferDocuments(offerId, user);
    const templates = await getAvailableDocumentTemplates(user);

    return NextResponse.json({
      success: true,
      documents,
      templates,
    });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching offer documents:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch offer documents.' },
      { status: error.status || 500 }
    );
  }
}

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
        { success: false, error: 'Document type is required (e.g. "Offer_Letter", "Appointment_Letter", "NDA").' },
        { status: 400 }
      );
    }

    const documentMeta = await generateOfferDocument(
      offerId,
      { documentType, templateId },
      user
    );

    return NextResponse.json({
      success: true,
      document: documentMeta,
    });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error generating offer document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate offer document.' },
      { status: error.status || 500 }
    );
  }
}
