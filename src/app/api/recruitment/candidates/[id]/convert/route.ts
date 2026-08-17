import { NextRequest, NextResponse } from 'next/server';
import {
  requireEmployee,
  authAccessErrorResponse,
  isAuthAccessError,
} from '@/lib/auth-session';
import {
  verifyCandidateConversionEligibility,
  convertCandidateToEmployee,
} from '@/lib/recruitment/conversion-service';
import { type RecruitmentUser } from '@/lib/recruitment/rbac-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireEmployee();
    const { id: candidateId } = await params;

    const eligibility = await verifyCandidateConversionEligibility(candidateId);

    return NextResponse.json({
      success: true,
      eligibility,
    });
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check conversion eligibility.' },
      { status: 400 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await requireEmployee();
    if (employee.userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden. Only HR administrators can convert candidates to employees.' },
        { status: 403 }
      );
    }

    const { id: candidateId } = await params;
    const body = await req.json().catch(() => ({}));

    const actor: RecruitmentUser = {
      id: employee.id,
      userRole: employee.userRole,
      department: employee.department,
      name: employee.name,
      email: employee.email,
    };

    const result = await convertCandidateToEmployee(candidateId, actor, body);

    return NextResponse.json(result);
  } catch (error: any) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    const status = error.message?.includes('authorized') || error.message?.includes('Forbidden') ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to convert candidate.' },
      { status }
    );
  }
}
