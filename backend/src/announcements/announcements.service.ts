import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AnnouncementAudience, AnnouncementCategory, EmploymentStatus, UserRole } from '@prisma/client';

@Injectable()
export class AnnouncementsService {
  constructor(private prisma: PrismaService) {}

  private serialize(announcement: any) {
    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      postedByDepartment: announcement.postedByDepartment,
      postedByName: announcement.postedBy?.name ?? null,
      isPinned: announcement.isPinned,
      publishedAt: announcement.publishedAt ? new Date(announcement.publishedAt).toISOString() : null,
      expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString() : null,
      targetAudience: announcement.targetAudience,
      targetDepartment: announcement.targetDepartment,
      targetLocation: announcement.targetLocation,
      targetRole: announcement.targetRole,
      isArchived: announcement.isArchived,
      createdAt: announcement.createdAt ? new Date(announcement.createdAt).toISOString() : null,
      updatedAt: announcement.updatedAt ? new Date(announcement.updatedAt).toISOString() : null,
    };
  }

  async findAll(userId: string, scope?: string) {
    const viewer = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, department: true, location: true, userRole: true },
    });

    if (!viewer) {
      throw new NotFoundException('Employee not found');
    }

    if (scope === 'admin') {
      if (viewer.userRole !== 'admin') {
        throw new ForbiddenException('Admin access required');
      }
      const announcements = await this.prisma.announcement.findMany({
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return announcements.map((a) => this.serialize(a));
    }

    const now = new Date();
    const where = {
      isArchived: false,
      AND: [
        {
          OR: [
            { targetAudience: 'All' as const },
            { targetAudience: 'Department' as const, targetDepartment: viewer.department },
            { targetAudience: 'Location' as const, targetLocation: viewer.location },
            { targetAudience: 'Role' as const, targetRole: viewer.userRole },
          ],
        },
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    };

    const limit = scope === 'dashboard' ? 3 : undefined;

    const announcements = await this.prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    return announcements.map((a) => this.serialize(a));
  }

  async create(userId: string, body: any) {
    const admin = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { id: true, userRole: true, department: true },
    });

    if (!admin || admin.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const title = (body.title || '').trim();
    const bodyText = (body.body || '').trim();
    if (!title) throw new BadRequestException('Title is required');
    if (!bodyText) throw new BadRequestException('Body is required');

    const count = await this.prisma.announcement.count();
    const newId = `ANN-${String(count + 1).padStart(3, '0')}`;

    const announcement = await this.prisma.announcement.create({
      data: {
        id: newId,
        title,
        body: bodyText,
        category: (body.category || 'General') as AnnouncementCategory,
        postedById: admin.id,
        postedByDepartment: (body.postedByDepartment || admin.department || 'HR').trim(),
        isPinned: body.isPinned === true,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        targetAudience: (body.targetAudience || 'All') as AnnouncementAudience,
        targetDepartment: body.targetDepartment || null,
        targetLocation: body.targetLocation || null,
        targetRole: body.targetRole || null,
      },
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    return this.serialize(announcement);
  }

  async update(userId: string, id: string, body: any) {
    const admin = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { userRole: true },
    });
    if (!admin || admin.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    if (body.action === 'archive' || body.action === 'unarchive') {
      const updated = await this.prisma.announcement.update({
        where: { id },
        data: { isArchived: body.action === 'archive' },
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return this.serialize(updated);
    }

    if (body.action === 'pin' || body.action === 'unpin') {
      const updated = await this.prisma.announcement.update({
        where: { id },
        data: { isPinned: body.action === 'pin' },
        include: { postedBy: { select: { id: true, name: true, email: true } } },
      });
      return this.serialize(updated);
    }

    const data: any = {};
    if (body.title) data.title = body.title.trim();
    if (body.body) data.body = body.body.trim();
    if (body.category) data.category = body.category;
    if (body.postedByDepartment) data.postedByDepartment = body.postedByDepartment.trim();
    if (typeof body.isPinned === 'boolean') data.isPinned = body.isPinned;
    if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (body.targetAudience) data.targetAudience = body.targetAudience;
    if (body.targetDepartment !== undefined) data.targetDepartment = body.targetDepartment;
    if (body.targetLocation !== undefined) data.targetLocation = body.targetLocation;
    if (body.targetRole !== undefined) data.targetRole = body.targetRole;

    const updated = await this.prisma.announcement.update({
      where: { id },
      data,
      include: { postedBy: { select: { id: true, name: true, email: true } } },
    });

    return this.serialize(updated);
  }

  async delete(userId: string, id: string) {
    const admin = await this.prisma.employee.findUnique({
      where: { id: userId },
      select: { userRole: true },
    });
    if (!admin || admin.userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    await this.prisma.announcement.delete({ where: { id } });
    return { success: true, id };
  }
}

