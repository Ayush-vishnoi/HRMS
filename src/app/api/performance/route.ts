import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { KraPriority, KraStatus, type Prisma } from '@prisma/client';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
  requireRole,
} from '@/lib/auth-session';

const mapKraStatusToPrisma = (status?: string): KraStatus => {
  if (!status) return KraStatus.NotStarted;
  const s = status.toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'completed') return KraStatus.Completed;
  if (s.includes('review')) return KraStatus.UnderReview;
  if (s.includes('progress')) return KraStatus.InProgress;
  return KraStatus.NotStarted;
};

const mapPrismaStatusToDisplay = (status: KraStatus): string => {
  switch (status) {
    case KraStatus.Completed: return 'Completed';
    case KraStatus.UnderReview: return 'Under Review';
    case KraStatus.InProgress: return 'In Progress';
    case KraStatus.NotStarted:
    default:
      return 'Not Started';
  }
};

export async function GET(_request: Request) {
  try {
    const employee = await requireEmployee();
    const whereClause: Prisma.PerformanceKraWhereInput | undefined =
      employee.userRole === 'admin'
        ? undefined
        : employee.userRole === 'manager'
          ? {
              OR: [
                { assignedById: employee.id },
                { assignedToId: employee.id },
                { assignedTo: { managerId: employee.id } },
              ],
            }
          : { assignedToId: employee.id };

    const kras = await db.performanceKra.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
        assignedBy: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
      },
    });

    const formatted = kras.map((kra) => ({
      id: kra.id,
      title: kra.title,
      description: kra.description,
      keyResult: kra.keyResult,
      category: kra.category,
      assignedToId: kra.assignedToId,
      assignedTo: kra.assignedTo.name,
      assignedBy: kra.assignedBy.name,
      assignerRole: kra.assignedBy.roleTitle,
      assignedOn: kra.assignedOn,
      dueDate: kra.dueDate,
      priority: kra.priority,
      status: mapPrismaStatusToDisplay(kra.status),
      progress: kra.progress,
      weightage: kra.weightage,
      lastUpdate: kra.lastUpdate || '',
      deliverables: kra.deliverables,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching performance KRAs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch KRAs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const assigner = await requireRole('manager', 'admin');
    const body = await request.json();
    await requireEmployeeAccess(body.assignedToId);
    const count = await db.performanceKra.count();
    const id = `KRA-${1043 + count + 1}`;

    const newKra = await db.performanceKra.create({
      data: {
        id,
        title: body.title,
        description: body.description || 'Complete the assigned team deliverable.',
        keyResult: body.keyResult,
        category: body.category || 'Team Delivery',
        assignedToId: body.assignedToId,
        assignedById: assigner.id,
        assignedOn: body.assignedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        dueDate: body.dueDate,
        priority: (body.priority as KraPriority) || KraPriority.Medium,
        status: mapKraStatusToPrisma(body.status),
        progress: Number(body.progress) || 0,
        weightage: Number(body.weightage) || 20,
        lastUpdate: body.lastUpdate || 'Task assigned by manager; waiting for team member update.',
        deliverables: body.deliverables || ['Progress update', 'Completed work handover'],
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
        assignedBy: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
      },
    });

    const formatted = {
      id: newKra.id,
      title: newKra.title,
      description: newKra.description,
      keyResult: newKra.keyResult,
      category: newKra.category,
      assignedToId: newKra.assignedToId,
      assignedTo: newKra.assignedTo.name,
      assignedBy: newKra.assignedBy.name,
      assignerRole: newKra.assignedBy.roleTitle,
      assignedOn: newKra.assignedOn,
      dueDate: newKra.dueDate,
      priority: newKra.priority,
      status: mapPrismaStatusToDisplay(newKra.status),
      progress: newKra.progress,
      weightage: newKra.weightage,
      lastUpdate: newKra.lastUpdate || '',
      deliverables: newKra.deliverables,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating KRA:', error);
    return NextResponse.json({ success: false, error: 'Failed to create KRA' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, progress, status, lastUpdate } = body;
    const existing = await db.performanceKra.findUnique({
      where: { id },
      select: { assignedToId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'KRA not found' },
        { status: 404 },
      );
    }

    await requireEmployeeAccess(existing.assignedToId);

    const updated = await db.performanceKra.update({
      where: { id },
      data: {
        ...(progress !== undefined ? { progress: Number(progress) } : {}),
        ...(status !== undefined ? { status: mapKraStatusToPrisma(status) } : {}),
        ...(lastUpdate !== undefined ? { lastUpdate } : {}),
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
        assignedBy: {
          select: { id: true, name: true, roleTitle: true, department: true },
        },
      },
    });

    const formatted = {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      keyResult: updated.keyResult,
      category: updated.category,
      assignedToId: updated.assignedToId,
      assignedTo: updated.assignedTo.name,
      assignedBy: updated.assignedBy.name,
      assignerRole: updated.assignedBy.roleTitle,
      assignedOn: updated.assignedOn,
      dueDate: updated.dueDate,
      priority: updated.priority,
      status: mapPrismaStatusToDisplay(updated.status),
      progress: updated.progress,
      weightage: updated.weightage,
      lastUpdate: updated.lastUpdate || '',
      deliverables: updated.deliverables,
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating KRA:', error);
    return NextResponse.json({ success: false, error: 'Failed to update KRA' }, { status: 500 });
  }
}
