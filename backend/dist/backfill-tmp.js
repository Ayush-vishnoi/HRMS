"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
const db = new client_1.PrismaClient();
const meetingIdFor = (interviewId) => `i${(0, node_crypto_1.createHash)('sha256').update(interviewId).digest('hex').slice(1, 32)}`;
const statusFor = (status) => {
    if (status === 'Cancelled')
        return 'CANCELLED';
    if (status === 'Completed' || status === 'NoShow' || status === 'No Show')
        return 'COMPLETED';
    if (status === 'InProgress')
        return 'ONGOING';
    return 'UPCOMING';
};
async function main() {
    const interviews = await db.recruitment_interviews.findMany({
        include: {
            interview_panel_members: true,
            recruitment_candidates: { select: { name: true } },
        },
        orderBy: { starts_at: 'asc' },
    });
    console.log(`Found ${interviews.length} interviews.`);
    for (const interview of interviews) {
        const lead = interview.interview_panel_members.find((member) => member.is_lead) ??
            interview.interview_panel_members[0];
        if (!lead) {
            console.log(`SKIP ${interview.id} — no panel members.`);
            continue;
        }
        const meetingId = meetingIdFor(interview.id);
        const panelIds = [...new Set(interview.interview_panel_members.map((member) => member.employee_id))];
        const attendeeIds = panelIds.filter((employeeId) => employeeId !== lead.employee_id);
        const title = `${interview.title} — ${interview.recruitment_candidates.name}`.slice(0, 150);
        await db.$transaction(async (tx) => {
            await tx.meeting.upsert({
                where: { id: meetingId },
                create: {
                    id: meetingId,
                    title,
                    type: 'TEAM',
                    description: `Interview for ${interview.recruitment_candidates.name} (Round ${interview.round}). Managed by Recruitment ATS.`,
                    startsAt: interview.starts_at,
                    endsAt: interview.ends_at,
                    allDay: false,
                    location: interview.location,
                    videoLink: interview.meeting_url,
                    organizerId: lead.employee_id,
                    recurrence: 'NONE',
                    reminderMinutes: 15,
                    status: statusFor(interview.status),
                    attendees: {
                        create: [
                            { employeeId: lead.employee_id, rsvp: 'ACCEPTED' },
                            ...attendeeIds.map((employeeId) => ({ employeeId, rsvp: 'PENDING' })),
                        ],
                    },
                },
                update: {
                    title,
                    startsAt: interview.starts_at,
                    endsAt: interview.ends_at,
                    location: interview.location,
                    videoLink: interview.meeting_url,
                    organizerId: lead.employee_id,
                    status: statusFor(interview.status),
                },
            });
            const existingAttendees = await tx.meetingAttendee.findMany({
                where: { meetingId },
                select: { employeeId: true },
            });
            const currentIds = new Set([lead.employee_id, ...attendeeIds]);
            await tx.meetingAttendee.deleteMany({
                where: { meetingId, employeeId: { notIn: [...currentIds] } },
            });
            for (const employeeId of currentIds) {
                if (!existingAttendees.some((attendee) => attendee.employeeId === employeeId)) {
                    await tx.meetingAttendee.create({
                        data: { meetingId, employeeId, rsvp: employeeId === lead.employee_id ? 'ACCEPTED' : 'PENDING' },
                    });
                }
            }
        });
        console.log(`SYNCED ${interview.id} → ${meetingId} | "${title}" | status=${statusFor(interview.status)} | organizer=${lead.employee_id} | attendees=${attendeeIds.join(',') || 'none'}`);
    }
    console.log('Backfill complete.');
}
main().finally(() => db.$disconnect());
//# sourceMappingURL=backfill-tmp.js.map