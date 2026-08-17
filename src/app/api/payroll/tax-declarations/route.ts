import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  getCurrentEmployee,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const financialYear = url.searchParams.get('financialYear') || '2026-27';
    const viewAll = url.searchParams.get('view') === 'all' && (user.userRole === 'admin' || user.userRole === 'manager');

    if (viewAll) {
      const declarations = await db.employeeTaxDeclaration.findMany({
        where: { financialYear },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({ success: true, data: declarations });
    }

    // Role check: non-admin can only see own declaration
    const targetId = user.userRole === 'admin' ? employeeId : user.id;

    const declaration = await db.employeeTaxDeclaration.findUnique({
      where: {
        employeeId_financialYear: {
          employeeId: targetId,
          financialYear,
        },
      },
    });

    return NextResponse.json({ success: true, data: declaration });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching tax declarations:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tax declarations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const {
      employeeId = user.id,
      financialYear = '2026-27',
      regime = 'New',
      section80C = 0,
      section80D = 0,
      section80G = 0,
      section80CCD_1B = 0,
      section80E = 0,
      section80TTA = 0,
      hraExemptionRent = 0,
      homeLoanInterest = 0,
      otherExemptions = 0,
      declarationStatus = 'Submitted',
      proofUrls = [],
    } = body;

    const targetId = user.userRole === 'admin' ? employeeId : user.id;

    const declaration = await db.employeeTaxDeclaration.upsert({
      where: {
        employeeId_financialYear: {
          employeeId: targetId,
          financialYear,
        },
      },
      update: {
        regime,
        section80C: Number(section80C),
        section80D: Number(section80D),
        section80G: Number(section80G),
        section80CCD_1B: Number(section80CCD_1B),
        section80E: Number(section80E),
        section80TTA: Number(section80TTA),
        hraExemptionRent: Number(hraExemptionRent),
        homeLoanInterest: Number(homeLoanInterest),
        otherExemptions: Number(otherExemptions),
        declarationStatus,
        proofUrls,
      },
      create: {
        id: `decl-${targetId}-${financialYear}`,
        employeeId: targetId,
        financialYear,
        regime,
        section80C: Number(section80C),
        section80D: Number(section80D),
        section80G: Number(section80G),
        section80CCD_1B: Number(section80CCD_1B),
        section80E: Number(section80E),
        section80TTA: Number(section80TTA),
        hraExemptionRent: Number(hraExemptionRent),
        homeLoanInterest: Number(homeLoanInterest),
        otherExemptions: Number(otherExemptions),
        declarationStatus,
        proofUrls,
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: 'SUBMIT_TAX_DECLARATION',
        module: 'Tax',
        employeeId: targetId,
        details: JSON.stringify({ financialYear, regime, declarationStatus }),
      },
    });

    return NextResponse.json({ success: true, data: declaration });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error saving tax declaration:', error);
    return NextResponse.json({ success: false, error: 'Failed to save tax declaration' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireEmployee();
    if (adminUser.userRole !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only HR admins can verify tax declarations.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, declarationStatus, verificationRemarks, rejectionReason, verifiedAmountJson } = body;

    if (!id || !declarationStatus) {
      return NextResponse.json({ success: false, error: 'Declaration ID and status are required.' }, { status: 400 });
    }

    const updated = await db.employeeTaxDeclaration.update({
      where: { id },
      data: {
        declarationStatus,
        verificationRemarks: verificationRemarks || null,
        rejectionReason: rejectionReason || null,
        verifiedAmountJson: verifiedAmountJson || null,
        verifiedByAdminId: adminUser.id,
        verifiedAt: declarationStatus === 'Approved' ? new Date() : null,
      },
    });

    // Notify employee
    await db.userNotification.create({
      data: {
        id: `notif-tax-${Date.now()}`,
        userId: updated.employeeId,
        title: `Tax Declaration ${declarationStatus}`,
        message: `Your tax declaration for FY ${updated.financialYear} was ${declarationStatus.toLowerCase()} by HR. ${verificationRemarks ? `Remarks: ${verificationRemarks}` : ''}`,
        type: 'Approval',
        linkUrl: '/payroll',
      },
    });

    // Audit Log
    await db.auditLog.create({
      data: {
        id: `audit-${Date.now()}`,
        action: `TAX_DECLARATION_${declarationStatus.toUpperCase()}`,
        module: 'Tax',
        employeeId: updated.employeeId,
        details: JSON.stringify({ id, declarationStatus, verificationRemarks, verifiedBy: adminUser.id }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating tax declaration status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update tax declaration' }, { status: 500 });
  }
}
