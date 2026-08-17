import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const [plans, enrollments, claims] = await Promise.all([
      db.benefitPlan.findMany({
        where: { isActive: true },
      }),
      db.employeeBenefitEnrollment.findMany({
        where: employeeId ? { employeeId } : {},
        include: {
          plan: true,
          dependents: true,
          claims: true,
        },
      }),
      db.benefitClaim.findMany({
        where: employeeId ? { employeeId } : {},
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { plans, enrollments, claims },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching benefits data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch benefits data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body; // action: 'enroll' | 'claim' | 'dependent'

    if (action === 'claim') {
      const { enrollmentId, employeeId, claimType, claimAmount, hospital, incidentDate } = body;
      const newClaim = await db.benefitClaim.create({
        data: {
          id: `CLM-${Date.now().toString(36)}`,
          enrollmentId,
          employeeId,
          claimType,
          claimAmount: Number(claimAmount),
          hospital,
          incidentDate,
          status: 'Submitted',
        },
      });
      return NextResponse.json({ success: true, data: newClaim }, { status: 201 });
    }

    if (action === 'dependent') {
      const { enrollmentId, name, relationship, dateOfBirth, gender } = body;
      const newDep = await db.benefitDependent.create({
        data: {
          id: `DEP-${Date.now().toString(36)}`,
          enrollmentId,
          name,
          relationship: relationship || 'Spouse',
          dateOfBirth,
          gender,
        },
      });
      return NextResponse.json({ success: true, data: newDep }, { status: 201 });
    }

    if (action === 'enroll') {
      const { employeeId, benefitPlanId, coverageStartDate, coverageEndDate } = body;
      const enrollment = await db.employeeBenefitEnrollment.create({
        data: {
          id: `ENR-${Date.now().toString(36)}`,
          employeeId,
          benefitPlanId,
          enrollmentDate: new Date().toISOString().split('T')[0],
          coverageStartDate: coverageStartDate || '2026-04-01',
          coverageEndDate: coverageEndDate || '2027-03-31',
          status: 'Active',
        },
        include: { plan: true },
      });
      return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error in benefits action:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process benefits request' },
      { status: 500 }
    );
  }
}
