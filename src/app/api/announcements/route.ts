import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireRole,
} from '@/lib/auth-session';
import { notifyUsers } from '@/lib/notifications/notify';
import type {
  AnnouncementAudience,
  AnnouncementCategory,
  EmploymentStatus,
  UserRole,
} from '@prisma/client';

const CATEGORIES = ['General', 'Event', 'Holiday', 'Urgent', 'Policy'] as const;
const AUDIENCES = ['All', 'Department', 'Location', 'Role'] as const;
const ROLES = ['employee', 'manager', 'admin'] as const;

type AnnouncementCategoryValue = (typeof CATEGORIES)[number];
type AnnouncementAudienceValue = (typeof AUDIENCES)[number];

const isCategory = (value: unknown): value is AnnouncementCategoryValue =>
  typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);

const isAudience = (value: unknown): value is AnnouncementAudienceValue =>
  typeof value === 'string' && (AUDIENCES as readonly string[]).includes(value);

const isRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/** Build the audience-matching Prisma `where` for a given employee. */
const audienceWhere = (employee: {
  department: string;
  location: string | null;
  userRole: UserRole;
}) => ({
  OR: [
    { targetAudience: 'All' as const },
    {
      targetAudience: 'Department' as const,
      targetDepartment: employee.department,
    },
    {
      targetAudience: 'Location' as const,
      targetLocation: employee.location,
    },
    {
      targetAudience: 'Role' as const,
      targetRole: employee.userRole,
    },
  ],
});

/** Serialize an Announcement row for API responses. */
const serializeAnnouncement = (announcement: {
  id: string;
  title: string;
  body: string;
  category: string;
  postedByDepartment: string;
  isPinned: boolean;
  publishedAt: Date;
  expiresAt: Date | null;
  targetAudience: string;
  targetDepartment: string | null;
  targetLocation: string | null;
  targetRole: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  postedBy?: { id: string; name: string; email: string } | null;
}) => ({
  id: announcement.id,
  title: announcement.title,
  body: announcement.body,
  category: announcement.category,
  postedByDepartment: announcement.postedByDepartment,
  postedByName: announcement.postedBy?.name ?? null,
  isPinned: announcement.isPinned,
  publishedAt: announcement.publishedAt.toISOString(),
  expiresAt: announcement.expiresAt ? announcement.expiresAt.toISOString() : null,
  targetAudience: announcement.targetAudience,
  targetDepartment: announcement.targetDepartment,
  targetLocation: announcement.targetLocation,
  targetRole: announcement.targetRole,
  isArchived: announcement.isArchived,
  createdAt: announcement.createdAt.toISOString(),
  updatedAt: announcement.updatedAt.toISOString(),
});

/**
 * GET /api/announcements
 * - Employees: live, non-expired, non-archived announcements matching their
 *   audience, pinned first then newest. `?scope=dashboard` limits to 3 for the
 *   dashboard widget; default returns all for the full list page.
 * - Admins: `?scope=admin` returns everything (incl. archived/expired) for the
 *   HR management screen.
 */
export async function GET(request: Request) {
  try {
    const employee = await requireEmployee();
    const scope = new URL(request.url).searchParams.get('scope');

    if (scope === 'admin') {
      if (employee.userRole !== 'admin') {
        return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
      }
      const announcements = await db.announcement.findMany({
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({
        success: true,
        data: announcements.map(serializeAnnouncement),
      });
    }

    // requireEmployee()'s select omits location, which audience matching needs.
    const viewer = await db.employee.findUnique({
      where: { id: employee.id },
      select: { department: true, location: true, userRole: true },
    });
    if (!viewer) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const now = new Date();
    const where = {
      isArchived: false,
      AND: [
        audienceWhere(viewer),
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    };

    const limit = scope === 'dashboard' ? 3 : undefined;

    const announcements = await db.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({
      success: true,
      data: announcements.map(serializeAnnouncement),
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch announcements' }, { status: 500 });
  }
}

/** Validate + normalize the targeting fields of an announcement payload. */
const resolveTargeting = (body: Record<string, unknown>) => {
  const audience = isAudience(body.targetAudience) ? body.targetAudience : 'All';

  const targeting: {
    targetAudience: AnnouncementAudience;
    targetDepartment: string | null;
    targetLocation: string | null;
    targetRole: UserRole | null;
  } = {
    targetAudience: audience as AnnouncementAudience,
    targetDepartment: null,
    targetLocation: null,
    targetRole: null,
  };

  if (audience === 'Department') {
    if (typeof body.targetDepartment !== 'string' || !body.targetDepartment.trim()) {
      throw new ValidationError('targetDepartment is required when audience is Department');
    }
    targeting.targetDepartment = body.targetDepartment.trim();
  } else if (audience === 'Location') {
    if (typeof body.targetLocation !== 'string' || !body.targetLocation.trim()) {
      throw new ValidationError('targetLocation is required when audience is Location');
    }
    targeting.targetLocation = body.targetLocation.trim();
  } else if (audience === 'Role') {
    if (!isRole(body.targetRole)) {
      throw new ValidationError('targetRole must be employee, manager, or admin when audience is Role');
    }
    targeting.targetRole = body.targetRole;
  }

  return targeting;
};

class ValidationError extends Error {}

/** Notify the employees who match an announcement's targeting. Never throws. */
const notifyAudience = async (
  targeting: {
    targetAudience: AnnouncementAudience;
    targetDepartment: string | null;
    targetLocation: string | null;
    targetRole: UserRole | null;
  },
  payload: { title: string; message: string },
) => {
  try {
    const activeStatus: EmploymentStatus[] = ['Active', 'OnLeave', 'Remote'];
    const where =
      targeting.targetAudience === 'All'
        ? { status: { in: activeStatus } }
        : targeting.targetAudience === 'Department'
          ? {
              status: { in: activeStatus },
              department: targeting.targetDepartment ?? undefined,
            }
          : targeting.targetAudience === 'Location'
            ? {
                status: { in: activeStatus },
                location: targeting.targetLocation ?? undefined,
              }
            : {
                status: { in: activeStatus },
                userRole: targeting.targetRole ?? undefined,
              };

    const recipients = await db.employee.findMany({
      where,
      select: { id: true },
    });

    await notifyUsers(
      recipients.map((recipient) => recipient.id),
      {
        ...payload,
        type: 'Announcement',
        linkUrl: '/announcements',
      },
    );
  } catch (error) {
    console.error('[announcements] Failed to notify audience:', error);
  }
};

/**
 * POST /api/announcements — HR admin creates an announcement.
 * Body: { title, body, category, postedByDepartment, isPinned, expiresAt,
 *         targetAudience, targetDepartment, targetLocation, targetRole }
 */
export async function POST(request: Request) {
  try {
    const admin = await requireRole('admin');
    const body = await request.json();

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const bodyText = typeof body?.body === 'string' ? body.body.trim() : '';
    const postedByDepartment =
      typeof body?.postedByDepartment === 'string' && body.postedByDepartment.trim()
        ? body.postedByDepartment.trim()
        : admin.department;

    if (!title) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    if (title.length > 150) {
      return NextResponse.json({ success: false, error: 'Title must be 150 characters or fewer' }, { status: 400 });
    }
    if (!bodyText) return NextResponse.json({ success: false, error: 'Body is required' }, { status: 400 });

    const category: AnnouncementCategoryValue = isCategory(body?.category) ? body.category : 'General';
    const isPinned = body?.isPinned === true;

    let expiresAt: Date | null = null;
    if (body?.expiresAt !== undefined && body?.expiresAt !== null && body?.expiresAt !== '') {
      const parsed = new Date(body.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: 'expiresAt must be a valid date' }, { status: 400 });
      }
      expiresAt = parsed;
    }

    let targeting;
    try {
      targeting = resolveTargeting(body ?? {});
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      throw error;
    }

    const count = await db.announcement.count();
    const newId = `ANN-${String(count + 1).padStart(3, '0')}`;

    const announcement = await db.announcement.create({
      data: {
        id: newId,
        title,
        body: bodyText,
        category: category as AnnouncementCategory,
        postedById: admin.id,
        postedByDepartment,
        isPinned,
        expiresAt,
        ...targeting,
      },
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    await notifyAudience(targeting, {
      title: 'New Company Announcement',
      message: `${announcement.title} — ${announcement.postedByDepartment}`,
    });

    return NextResponse.json({ success: true, data: serializeAnnouncement(announcement) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error creating announcement:', error);
    return NextResponse.json({ success: false, error: 'Failed to create announcement' }, { status: 500 });
  }
}

/**
 * PATCH /api/announcements — HR admin updates, pins/unpins, or archives an
 * announcement. Body: { id, ...fields } or { id, action: 'archive' | 'unarchive' }.
 */
export async function PATCH(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Announcement id is required' }, { status: 400 });
    }

    const existing = await db.announcement.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
    }

    // Quick actions: pin toggle / archive toggle
    if (body?.action === 'archive' || body?.action === 'unarchive') {
      const updated = await db.announcement.update({
        where: { id },
        data: { isArchived: body.action === 'archive' },
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({ success: true, data: serializeAnnouncement(updated) });
    }

    if (body?.action === 'pin' || body?.action === 'unpin') {
      const updated = await db.announcement.update({
        where: { id },
        data: { isPinned: body.action === 'pin' },
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({ success: true, data: serializeAnnouncement(updated) });
    }

    // Full edit
    const data: Record<string, unknown> = {};

    if (typeof body?.title === 'string') {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      if (title.length > 150) {
        return NextResponse.json({ success: false, error: 'Title must be 150 characters or fewer' }, { status: 400 });
      }
      data.title = title;
    }
    if (typeof body?.body === 'string') {
      const bodyText = body.body.trim();
      if (!bodyText) return NextResponse.json({ success: false, error: 'Body cannot be empty' }, { status: 400 });
      data.body = bodyText;
    }
    if (isCategory(body?.category)) data.category = body.category;
    if (typeof body?.postedByDepartment === 'string' && body.postedByDepartment.trim()) {
      data.postedByDepartment = body.postedByDepartment.trim();
    }
    if (typeof body?.isPinned === 'boolean') data.isPinned = body.isPinned;

    if (body?.expiresAt === null || body?.expiresAt === '') {
      data.expiresAt = null;
    } else if (body?.expiresAt !== undefined) {
      const parsed = new Date(body.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: 'expiresAt must be a valid date' }, { status: 400 });
      }
      data.expiresAt = parsed;
    }

    if (body?.targetAudience !== undefined) {
      let targeting;
      try {
        targeting = resolveTargeting(body);
      } catch (error) {
        if (error instanceof ValidationError) {
          return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        throw error;
      }
      Object.assign(data, targeting);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const updated = await db.announcement.update({
      where: { id },
      data,
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ success: true, data: serializeAnnouncement(updated) });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
    }
    console.error('Error updating announcement:', error);
    return NextResponse.json({ success: false, error: 'Failed to update announcement' }, { status: 500 });
  }
}

/** DELETE /api/announcements?id=ANN-001 — HR admin hard-deletes an announcement. */
export async function DELETE(request: Request) {
  try {
    await requireRole('admin');
    const body = await request.json().catch(() => ({}));
    const id = typeof body?.id === 'string' ? body.id : new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Announcement id is required' }, { status: 400 });
    }

    await db.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Announcement not found' }, { status: 404 });
    }
    console.error('Error deleting announcement:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete announcement' }, { status: 500 });
  }
}
