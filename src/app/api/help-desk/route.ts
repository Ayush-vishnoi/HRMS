import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';

const mapTicketCategory = (cat?: string): 'Attendance' | 'Leave' | 'Payroll' | 'Documents' | 'Policy' | 'GrievanceOrComplaint' | 'Other' => {
  if (!cat) return 'Other';
  const clean = cat.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.includes('grievance') || clean.includes('complaint')) return 'GrievanceOrComplaint';
  if (clean.includes('attendance')) return 'Attendance';
  if (clean.includes('leave')) return 'Leave';
  if (clean.includes('payroll')) return 'Payroll';
  if (clean.includes('doc')) return 'Documents';
  if (clean.includes('policy')) return 'Policy';
  return 'Other';
};

export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const category = new URL(request.url).searchParams.get('category');

    const tickets = await db.helpDeskTicket.findMany({
      where: {
        ...(category ? { category: mapTicketCategory(category) } : {}),
        ...(employee.userRole === 'admin' ? {} : { employeeId: employee.id }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { name: true, employeeCode: true, department: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching help desk tickets:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const body = await request.json();
    const id = `HR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const newTicket = await db.helpDeskTicket.create({
      data: {
        id,
        employeeId: employee.id,
        category: mapTicketCategory(body.category),
        priority: body.priority || 'Medium',
        subject: body.subject,
        description: body.description,
        status: 'Open',
        createdAt: new Date().toLocaleString('en-IN'),
      },
    });

    return NextResponse.json({ success: true, data: newTicket });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating ticket:', error);
    return NextResponse.json({ success: false, error: 'Failed to create ticket' }, { status: 500 });
  }
}


export async function PATCH(request: Request) {
  try {
    const resolver = await requireRole('admin');
    const body = await request.json();
    const { id, status, resolution } = body;

    const updated = await db.helpDeskTicket.update({
      where: { id },
      data: {
        status,
        resolution: resolution || undefined,
        resolvedById: resolver.id,
        ...(status === 'Resolved' ? { resolvedAt: new Date().toLocaleString('en-IN') } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating ticket:', error);
    return NextResponse.json({ success: false, error: 'Failed to update ticket' }, { status: 500 });
  }
}
