import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function inspectDatabase() {
  try {
    console.log('--- Connecting to DB... ---');
    await db.$connect();
    console.log('Connected to PostgreSQL successfully.');

    const employees = await db.employee.findMany();
    console.log(`Employees count: ${employees.length}`);

    const attendance = await db.attendanceRecord.findMany();
    console.log(`Attendance count: ${attendance.length}`);

    const leaves = await db.leaveRequest.findMany();
    console.log(`Leave requests count: ${leaves.length}`);

    const leaveBalances = await db.leaveBalance.findMany();
    console.log(`Leave balances count: ${leaveBalances.length}`);

    const lateClockIns = await db.lateClockInRequest.findMany();
    console.log(`Late clock-in requests count: ${lateClockIns.length}`);

    const teams = await db.managedTeam.findMany();
    console.log(`Managed teams count: ${teams.length}`);

    const teamMembers = await db.teamMember.findMany();
    console.log(`Team members count: ${teamMembers.length}`);

    const teamMetadata = await db.teamMemberMetadata.findMany();
    console.log(`Team metadata count: ${teamMetadata.length}`);

    const meetings = await db.meeting.findMany();
    console.log(`Meetings count: ${meetings.length}`);

    const meetingAttendees = await db.meetingAttendee.findMany();
    console.log(`Meeting attendees count: ${meetingAttendees.length}`);

    const payslips = await db.payslip.findMany();
    console.log(`Payslips count: ${payslips.length}`);

    const kras = await db.performanceKra.findMany();
    console.log(`Performance KRAs count: ${kras.length}`);

    const employeeDocs = await db.employeeDocument.findMany();
    console.log(`Employee documents count: ${employeeDocs.length}`);

    const docRequests = await db.documentRequest.findMany();
    console.log(`Document requests count: ${docRequests.length}`);

    const policies = await db.companyPolicy.findMany();
    console.log(`Company policies count: ${policies.length}`);

    const policyAcks = await db.policyAcknowledgement.findMany();
    console.log(`Policy acknowledgements count: ${policyAcks.length}`);

    const helpDesk = await db.helpDeskTicket.findMany();
    console.log(`Help desk tickets count: ${helpDesk.length}`);

    const assets = await db.asset.findMany();
    console.log(`Assets count: ${assets.length}`);

    const jobs = await db.recruitmentJob.findMany();
    console.log(`Recruitment jobs count: ${jobs.length}`);

    const candidates = await db.recruitmentCandidate.findMany();
    console.log(`Recruitment candidates count: ${candidates.length}`);

  } catch (error) {
    console.error('Database connection / inspection error:', error);
  } finally {
    await db.$disconnect();
  }
}

inspectDatabase();

