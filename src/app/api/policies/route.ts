import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';
import { notifyAllActiveEmployees } from '@/lib/notifications/notify';

export async function GET(_request: Request) {
  try {
    const employee = await requireEmployee();

    const policies = await db.companyPolicy.findMany({
      orderBy: { effectiveDate: 'desc' },
      include: {
        acknowledgements: employee.userRole === 'admin'
          ? true
          : {
              where: { employeeId: employee.id },
            },
      },
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching policies:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch policies' }, { status: 500 });
  }
}

const mapPolicyCategory = (cat: string): 'CodeOfConduct' | 'LeaveAndAttendance' | 'InformationSecurity' | 'WorkplaceSafety' | 'AntiHarassment' | 'RemoteWork' => {
  const clean = (cat || '').toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('conduct')) return 'CodeOfConduct';
  if (clean.includes('leave') || clean.includes('attendance')) return 'LeaveAndAttendance';
  if (clean.includes('security') || clean.includes('information')) return 'InformationSecurity';
  if (clean.includes('safety')) return 'WorkplaceSafety';
  if (clean.includes('harass') || clean.includes('posh')) return 'AntiHarassment';
  if (clean.includes('remote')) return 'RemoteWork';
  return 'CodeOfConduct';
};

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();

    if (body.action === 'acknowledge') {
      const ack = await db.policyAcknowledgement.upsert({
        where: {
          policyId_employeeId: {
            policyId: body.policyId,
            employeeId: employee.id,
          },
        },
        update: {
          acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
        create: {
          policyId: body.policyId,
          employeeId: employee.id,
          acknowledgedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        },
      });
      return NextResponse.json({ success: true, data: ack });
    }

    const uploader = await requireRole('admin');
    const count = await db.companyPolicy.count();
    const newId = `POL-${String(count + 1).padStart(3, '0')}`;

    const newPolicy = await db.companyPolicy.create({
      data: {
        id: body.id || newId,
        title: body.title,
        summary: body.summary,
        category: mapPolicyCategory(body.category),
        version: body.version || 'v1.0',
        effectiveDate: body.effectiveDate,
        updatedOn: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        uploadedById: uploader.id,
        mandatory: body.mandatory ?? true,
        acknowledgementRequired: body.acknowledgementRequired ?? true,
        fileName: body.fileName || 'policy-document.pdf',
        fileSize: body.fileSize || '1.0 MB',
      },
    });

    await notifyAllActiveEmployees({
      title: 'New Company Policy',
      message: `A new policy "${newPolicy.title}" (${newPolicy.version}) is now effective. Please review and acknowledge it.`,
      type: 'Policy',
      linkUrl: '/policies',
    });

    return NextResponse.json({ success: true, data: newPolicy });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating/acknowledging policy:', error);
    return NextResponse.json({ success: false, error: 'Failed to process policy request' }, { status: 500 });
  }
}

