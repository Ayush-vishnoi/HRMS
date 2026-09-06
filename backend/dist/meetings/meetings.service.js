"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const MEETING_TYPES = new Set([client_1.MeetingType.TEAM, client_1.MeetingType.ORG_EVENT]);
const RECURRENCES = new Set([client_1.Recurrence.NONE, client_1.Recurrence.DAILY, client_1.Recurrence.WEEKLY, client_1.Recurrence.MONTHLY]);
const MEETING_STATUSES = new Set([client_1.MeetingStatus.UPCOMING, client_1.MeetingStatus.ONGOING, client_1.MeetingStatus.COMPLETED, client_1.MeetingStatus.CANCELLED]);
const RSVP_STATUSES = new Set([client_1.RsvpStatus.ACCEPTED, client_1.RsvpStatus.DECLINED, client_1.RsvpStatus.PENDING]);
const meetingInclude = {
    organizer: { select: { id: true, name: true, avatarUrl: true, department: true } },
    attendees: {
        include: {
            employee: { select: { id: true, name: true, avatarUrl: true, department: true } },
        },
        orderBy: { employee: { name: 'asc' } },
    },
};
function isMeetingType(value) {
    return typeof value === 'string' && MEETING_TYPES.has(value);
}
function isRecurrence(value) {
    return typeof value === 'string' && RECURRENCES.has(value);
}
function isMeetingStatus(value) {
    return typeof value === 'string' && MEETING_STATUSES.has(value);
}
function isRsvpStatus(value) {
    return typeof value === 'string' && RSVP_STATUSES.has(value);
}
function newMeetingAttendeeId() {
    return `MA-${crypto.randomUUID().replaceAll('-', '').slice(0, 33)}`;
}
function validateMeetingInput(body, partial = false) {
    if ((!partial || body.title !== undefined) && (typeof body.title !== 'string' || body.title.trim().length < 3))
        return 'Meeting title must be at least 3 characters';
    if ((!partial || body.startsAt !== undefined) && (typeof body.startsAt !== 'string' || Number.isNaN(Date.parse(body.startsAt))))
        return 'Choose a valid start date and time';
    if ((!partial || body.endsAt !== undefined) && (typeof body.endsAt !== 'string' || Number.isNaN(Date.parse(body.endsAt))))
        return 'Choose a valid end date and time';
    if (body.type !== undefined && body.type !== null && !isMeetingType(body.type))
        return 'Choose a valid meeting type';
    if (body.recurrence !== undefined && body.recurrence !== null && !isRecurrence(body.recurrence))
        return 'Choose a valid recurrence';
    if (body.attendeeIds !== undefined && (!Array.isArray(body.attendeeIds) || body.attendeeIds.some((id) => typeof id !== 'string')))
        return 'Attendees are invalid';
    if (typeof body.startsAt === 'string' && typeof body.endsAt === 'string' && new Date(body.endsAt) <= new Date(body.startsAt))
        return 'End time must be after start time';
    return null;
}
function formatMeeting(meeting) {
    return {
        id: meeting.id,
        title: meeting.title,
        type: meeting.type,
        description: meeting.description || undefined,
        startsAt: meeting.startsAt.toISOString(),
        endsAt: meeting.endsAt.toISOString(),
        allDay: meeting.allDay,
        location: meeting.location || undefined,
        videoLink: meeting.videoLink || undefined,
        department: meeting.department || undefined,
        recurrence: meeting.recurrence,
        reminderMinutes: meeting.reminderMinutes ?? 15,
        status: meeting.status,
        organizer: {
            id: meeting.organizer.id,
            name: meeting.organizer.name,
            avatarUrl: meeting.organizer.avatarUrl || undefined,
            department: meeting.organizer.department,
        },
        attendees: meeting.attendees.map((attendee) => ({
            id: attendee.employee.id,
            name: attendee.employee.name,
            avatarUrl: attendee.employee.avatarUrl || undefined,
            department: attendee.employee.department,
            rsvp: attendee.rsvp,
            responseReason: attendee.responseReason || undefined,
        })),
    };
}
let MeetingsService = class MeetingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchEmployees(query) {
        const trimmed = query.trim().toLowerCase();
        const employees = await this.prisma.employee.findMany({
            where: trimmed
                ? {
                    OR: [
                        { name: { contains: trimmed, mode: 'insensitive' } },
                        { department: { contains: trimmed, mode: 'insensitive' } },
                        { email: { contains: trimmed, mode: 'insensitive' } },
                        { roleTitle: { contains: trimmed, mode: 'insensitive' } },
                    ],
                }
                : undefined,
            select: { id: true, name: true, avatarUrl: true, department: true, email: true, roleTitle: true },
        });
        return employees.map((emp) => ({
            id: emp.id,
            name: emp.name,
            avatarUrl: emp.avatarUrl,
            department: emp.department,
            email: emp.email,
            role: emp.roleTitle,
        }));
    }
    async findOne(employeeId, id) {
        const meeting = await this.prisma.meeting.findUnique({ where: { id }, include: meetingInclude });
        if (!meeting)
            throw new common_1.HttpException({ success: false, error: 'Meeting not found' }, 404);
        const isVisible = meeting.organizerId === employeeId ||
            meeting.attendees.length === 0 ||
            meeting.attendees.some((attendee) => attendee.employeeId === employeeId);
        if (!isVisible)
            throw new common_1.HttpException({ success: false, error: 'Meeting not found' }, 404);
        return formatMeeting(meeting);
    }
    async findAll(employeeId, filters) {
        const where = [];
        if (filters.type && filters.type !== 'ALL' && isMeetingType(filters.type))
            where.push({ type: filters.type });
        if (filters.department && filters.department !== 'ALL') {
            where.push({ OR: [{ department: filters.department }, { type: 'ORG_EVENT' }] });
        }
        if (filters.to)
            where.push({ startsAt: { lte: new Date(filters.to) } });
        if (filters.from)
            where.push({ endsAt: { gte: new Date(filters.from) } });
        const mine = filters.mine === 'true';
        where.push({
            OR: [
                { organizerId: employeeId },
                { attendees: { some: { employeeId } } },
                ...(mine ? [] : [{ attendees: { none: {} } }]),
            ],
        });
        const meetings = await this.prisma.meeting.findMany({
            where: { AND: where },
            orderBy: { startsAt: 'asc' },
            include: meetingInclude,
        });
        return meetings.map(formatMeeting);
    }
    async create(organizerId, body) {
        const validationError = validateMeetingInput(body);
        if (validationError)
            throw new common_1.BadRequestException(validationError);
        const organizer = await this.prisma.employee.findUnique({
            where: { id: organizerId },
            select: { id: true, name: true },
        });
        if (!organizer)
            throw new common_1.NotFoundException('Employee not found');
        const existingIds = await this.prisma.meeting.findMany({ select: { id: true } });
        const maxSuffix = existingIds.reduce((max, { id }) => {
            const match = /^MTG-(\d+)$/.exec(id);
            return match ? Math.max(max, Number(match[1])) : max;
        }, 0);
        const newId = `MTG-${String(maxSuffix + 1).padStart(3, '0')}`;
        const attendeeIds = Array.isArray(body.attendeeIds)
            ? [...new Set(body.attendeeIds.filter((value) => typeof value === 'string' && value !== organizerId))]
            : [];
        const newMeeting = await this.prisma.meeting.create({
            data: {
                id: typeof body.id === 'string' ? body.id : newId,
                title: body.title,
                type: isMeetingType(body.type) ? body.type : 'TEAM',
                description: typeof body.description === 'string' ? body.description : null,
                startsAt: new Date(body.startsAt),
                endsAt: new Date(body.endsAt),
                allDay: typeof body.allDay === 'boolean' ? body.allDay : false,
                location: typeof body.location === 'string' ? body.location : null,
                videoLink: typeof body.videoLink === 'string' ? body.videoLink : null,
                organizerId,
                department: typeof body.department === 'string' ? body.department : null,
                recurrence: isRecurrence(body.recurrence) ? body.recurrence : 'NONE',
                reminderMinutes: typeof body.reminderMinutes === 'number' ? body.reminderMinutes : 15,
                status: isMeetingStatus(body.status) ? body.status : 'UPCOMING',
                attendees: {
                    create: attendeeIds.map((employeeId) => ({
                        id: newMeetingAttendeeId(),
                        employeeId,
                        rsvp: employeeId === organizerId ? 'ACCEPTED' : 'PENDING',
                    })),
                },
            },
        });
        const populatedMeeting = await this.prisma.meeting.findUnique({ where: { id: newMeeting.id }, include: meetingInclude });
        if (!populatedMeeting)
            throw new Error('Created meeting could not be loaded');
        await this.notifyUsers(attendeeIds, {
            title: 'Meeting Invitation',
            message: `${organizer.name} invited you to "${newMeeting.title}" on ${newMeeting.startsAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
            type: 'Meeting',
            linkUrl: '/meetings',
        });
        return formatMeeting(populatedMeeting);
    }
    async update(employeeId, body) {
        const { id, action, rsvp, reason, ...updates } = body;
        if (typeof id !== 'string' || !id)
            throw new common_1.BadRequestException('Meeting ID is required');
        const existing = await this.prisma.meeting.findUnique({
            where: { id },
            select: { organizerId: true, startsAt: true, endsAt: true, attendees: { select: { employeeId: true, rsvp: true } } },
        });
        if (!existing)
            throw new common_1.HttpException({ success: false, error: 'Meeting not found' }, 404);
        if (action === 'cancel') {
            if (existing.organizerId !== employeeId) {
                throw new common_1.ForbiddenException('Only the organizer can cancel this meeting');
            }
            const cancelledMeeting = await this.prisma.meeting.update({
                where: { id },
                data: { status: 'CANCELLED' },
            });
            const cancelled = await this.prisma.meeting.findUnique({ where: { id }, include: meetingInclude });
            if (!cancelled)
                throw new Error('Cancelled meeting could not be loaded');
            await this.notifyUsers(existing.attendees.map((attendee) => attendee.employeeId).filter((attendeeId) => attendeeId !== employeeId), {
                title: 'Meeting Cancelled',
                message: `${cancelledMeeting.title} was cancelled.`,
                type: 'Meeting',
                linkUrl: '/meetings',
            });
            return formatMeeting(cancelled);
        }
        if (action === 'rsvp') {
            if (!isRsvpStatus(rsvp))
                throw new common_1.BadRequestException('Choose a valid RSVP status');
            if (!existing.attendees.some((attendee) => attendee.employeeId === employeeId)) {
                throw new common_1.ForbiddenException('You are not invited to this meeting');
            }
            const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
            if (rsvp === 'DECLINED' && !trimmedReason) {
                throw new common_1.BadRequestException('A reason is required when declining or cancelling a meeting');
            }
            if (trimmedReason.length > 500) {
                throw new common_1.BadRequestException('The reason must be 500 characters or fewer');
            }
            await this.prisma.meetingAttendee.update({
                where: { meetingId_employeeId: { meetingId: id, employeeId } },
                data: { rsvp, responseReason: trimmedReason || null },
            });
            const respondedMeeting = await this.prisma.meeting.findUnique({ where: { id }, include: meetingInclude });
            if (!respondedMeeting)
                throw new Error('Updated meeting could not be loaded');
            if (rsvp === 'DECLINED') {
                await this.notifyUsers([existing.organizerId], {
                    title: 'Meeting Declined',
                    message: `A participant declined "${respondedMeeting.title}"${trimmedReason ? `: ${trimmedReason}` : '.'}`,
                    type: 'Meeting',
                    linkUrl: '/meetings',
                });
            }
            return formatMeeting(respondedMeeting);
        }
        if (existing.organizerId !== employeeId) {
            throw new common_1.ForbiddenException('Only the organizer can update this meeting');
        }
        const mergedUpdates = {
            ...updates,
            startsAt: updates.startsAt ?? existing.startsAt.toISOString(),
            endsAt: updates.endsAt ?? existing.endsAt.toISOString(),
        };
        const validationError = validateMeetingInput(mergedUpdates, true);
        if (validationError)
            throw new common_1.BadRequestException(validationError);
        const attendeeIds = Array.isArray(updates.attendeeIds)
            ? [...new Set(updates.attendeeIds.filter((employeeId2) => employeeId2 !== existing.organizerId))]
            : undefined;
        const existingRsvps = new Map(existing.attendees.map((attendee) => [attendee.employeeId, attendee.rsvp]));
        const updated = await this.prisma.meeting.update({
            where: { id },
            data: {
                ...(typeof updates.title === 'string' ? { title: updates.title.trim() } : {}),
                ...(isMeetingType(updates.type) ? { type: updates.type } : {}),
                ...(updates.description !== undefined ? { description: updates.description || null } : {}),
                ...(typeof updates.startsAt === 'string' ? { startsAt: new Date(updates.startsAt) } : {}),
                ...(typeof updates.endsAt === 'string' ? { endsAt: new Date(updates.endsAt) } : {}),
                ...(typeof updates.allDay === 'boolean' ? { allDay: updates.allDay } : {}),
                ...(updates.location !== undefined ? { location: updates.location || null } : {}),
                ...(updates.videoLink !== undefined ? { videoLink: updates.videoLink || null } : {}),
                ...(updates.department !== undefined ? { department: updates.department || null } : {}),
                ...(isRecurrence(updates.recurrence) ? { recurrence: updates.recurrence } : {}),
                ...(typeof updates.reminderMinutes === 'number' ? { reminderMinutes: updates.reminderMinutes } : {}),
                ...(attendeeIds
                    ? {
                        attendees: {
                            deleteMany: {},
                            create: attendeeIds.map((employeeId) => ({
                                id: newMeetingAttendeeId(),
                                employeeId,
                                rsvp: existingRsvps.get(employeeId) ?? (employeeId === existing.organizerId ? 'ACCEPTED' : 'PENDING'),
                            })),
                        },
                    }
                    : {}),
            },
            include: meetingInclude,
        });
        return formatMeeting(updated);
    }
    async notifyUsers(userIds, notification) {
        const uniqueIds = [...new Set(userIds)];
        if (uniqueIds.length === 0)
            return;
        try {
            await this.prisma.userNotification.createMany({
                data: uniqueIds.map((userId) => ({
                    userId,
                    title: notification.title,
                    message: notification.message,
                    type: notification.type,
                    linkUrl: notification.linkUrl,
                })),
            });
        }
        catch (error) {
            console.error('Failed to create meeting notifications:', error);
        }
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map