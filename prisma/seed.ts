import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PostgreSQL database for HRMS...');

  // --------------------------------------------------------------------------
  // 1. SEED EMPLOYEES
  // --------------------------------------------------------------------------
  console.log('Creating employees...');
  const employeesData = [
    {
      id: 'EMP-001',
      employeeCode: 'EMP-2026-089',
      name: 'Ayush Vishnoi',
      email: 'ayush.vishnoi@company.com',
      roleTitle: 'AI/ML Intern Developer',
      userRole: 'employee' as const,
      department: 'AI/ML',
      phone: '+91 98765 43210',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '15 Mar 2026',
      location: 'Bengaluru, Karnataka',
      salary: 550000,
      managerId: 'EMP-002',
    },
    {
      id: 'EMP-002',
      employeeCode: 'EMP-2019-012',
      name: 'Arjun Mehta',
      email: 'arjun.mehta@company.com',
      roleTitle: 'Engineering Manager',
      userRole: 'manager' as const,
      department: 'Engineering',
      phone: '+91 98100 23456',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '10 Jan 2019',
      location: 'Gurugram, Haryana',
      salary: 3200000,
      managerId: 'EMP-006',
    },
    {
      id: 'EMP-003',
      employeeCode: 'EMP-2020-045',
      name: 'Rahul Verma',
      roleTitle: 'Staff Frontend Engineer',
      userRole: 'employee' as const,
      department: 'Engineering',
      email: 'rahul.verma@company.com',
      phone: '+91 98201 34567',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '01 Feb 2020',
      location: 'Pune, Maharashtra',
      salary: 2600000,
      managerId: 'EMP-002',
    },
    {
      id: 'EMP-004',
      employeeCode: 'EMP-2021-112',
      name: 'Neha Iyer',
      roleTitle: 'Lead HR Operations',
      userRole: 'employee' as const,
      department: 'Human Resources',
      email: 'neha.iyer@company.com',
      phone: '+91 98450 45678',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '12 Sep 2021',
      location: 'Chennai, Tamil Nadu',
      salary: 1800000,
      managerId: 'EMP-006',
    },
    {
      id: 'EMP-005',
      employeeCode: 'EMP-2022-156',
      name: 'Vikram Singh',
      roleTitle: 'Senior Backend Developer',
      userRole: 'employee' as const,
      department: 'Engineering',
      email: 'vikram.singh@company.com',
      phone: '+91 98710 56789',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      status: 'Remote' as const,
      joinDate: '18 Nov 2022',
      location: 'Jaipur, Rajasthan',
      salary: 2400000,
      managerId: 'EMP-002',
    },
    {
      id: 'EMP-006',
      employeeCode: 'EMP-2017-003',
      name: 'Priya Sharma',
      roleTitle: 'Head of Human Resources',
      userRole: 'admin' as const,
      department: 'Human Resources',
      email: 'priya.sharma@company.com',
      phone: '+91 98330 67890',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '01 Jun 2017',
      location: 'Mumbai, Maharashtra',
      salary: 3600000,
      managerId: null,
    },
    {
      id: 'EMP-007',
      employeeCode: 'EMP-2022-132',
      name: 'Ananya Rao',
      roleTitle: 'Product Marketing Manager',
      userRole: 'employee' as const,
      department: 'Marketing',
      email: 'ananya.rao@company.com',
      phone: '+91 99000 78901',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      status: 'OnLeave' as const,
      joinDate: '04 Apr 2022',
      location: 'Hyderabad, Telangana',
      salary: 2000000,
      managerId: 'EMP-002',
    },
    {
      id: 'EMP-008',
      employeeCode: 'EMP-2023-201',
      name: 'Siddharth Joshi',
      roleTitle: 'Financial Analyst',
      userRole: 'employee' as const,
      department: 'Finance',
      email: 'siddharth.joshi@company.com',
      phone: '+91 98670 89012',
      avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '22 Aug 2023',
      location: 'Ahmedabad, Gujarat',
      salary: 1400000,
      managerId: 'EMP-006',
    },
    {
      id: 'EMP-009',
      employeeCode: 'EMP-2021-126',
      name: 'Kavya Nair',
      roleTitle: 'AI Platform Lead',
      userRole: 'employee' as const,
      department: 'AI/ML',
      email: 'kavya.nair@company.com',
      phone: '+91 98860 11223',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '08 Jul 2021',
      location: 'Bengaluru, Karnataka',
      salary: 2800000,
      managerId: 'EMP-002',
    },
    {
      id: 'EMP-010',
      employeeCode: 'EMP-2024-214',
      name: 'Rohit Bansal',
      roleTitle: 'Frontend Engineer',
      userRole: 'employee' as const,
      department: 'Engineering',
      email: 'rohit.bansal@company.com',
      phone: '+91 98711 22334',
      avatarUrl: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&auto=format&fit=crop&q=80',
      status: 'Remote' as const,
      joinDate: '16 Jan 2024',
      location: 'Noida, Uttar Pradesh',
      salary: 1650000,
      managerId: 'EMP-003',
    },
    {
      id: 'EMP-011',
      employeeCode: 'EMP-2023-228',
      name: 'Ishita Sen',
      roleTitle: 'Backend Engineer',
      userRole: 'employee' as const,
      department: 'Engineering',
      email: 'ishita.sen@company.com',
      phone: '+91 98300 33445',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      status: 'Active' as const,
      joinDate: '03 Oct 2023',
      location: 'Kolkata, West Bengal',
      salary: 1700000,
      managerId: 'EMP-005',
    },
    {
      id: 'EMP-012',
      employeeCode: 'EMP-2024-245',
      name: 'Dev Malhotra',
      roleTitle: 'Machine Learning Engineer',
      userRole: 'employee' as const,
      department: 'AI/ML',
      email: 'dev.malhotra@company.com',
      phone: '+91 98180 44556',
      avatarUrl: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
      status: 'OnLeave' as const,
      joinDate: '21 May 2024',
      location: 'Delhi, India',
      salary: 1850000,
      managerId: 'EMP-009',
    },
  ];

  for (const emp of employeesData) {
    await prisma.employee.upsert({
      where: { id: emp.id },
      update: emp,
      create: emp,
    });
  }

  // --------------------------------------------------------------------------
  // 2. SEED LEAVE BALANCES FOR EMP-001 (AND OTHER EMPLOYEES)
  // --------------------------------------------------------------------------
  console.log('Creating leave balances...');
  const balances = [
    { employeeId: 'EMP-001', leaveType: 'Casual' as const, total: 12, used: 4, remaining: 8 },
    { employeeId: 'EMP-001', leaveType: 'Sick' as const, total: 10, used: 1, remaining: 9 },
    { employeeId: 'EMP-001', leaveType: 'Earned' as const, total: 20, used: 5, remaining: 15 },
    { employeeId: 'EMP-001', leaveType: 'WFH' as const, total: 12, used: 8, remaining: 4 },
  ];

  for (const b of balances) {
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year_leaveType: {
          employeeId: b.employeeId,
          year: 2026,
          leaveType: b.leaveType,
        },
      },
      update: b,
      create: { ...b, year: 2026 },
    });
  }

  // --------------------------------------------------------------------------
  // 3. SEED ATTENDANCE RECORDS
  // --------------------------------------------------------------------------
  console.log('Creating attendance records...');
  const attendanceLogs = [
    { id: 'ATT-001', employeeId: 'EMP-001', date: '2026-08-06', checkIn: '09:02 AM', checkOut: 'In Progress', hoursWorked: '7h 20m', status: 'OnTime' as const, location: 'Bengaluru HQ' },
    { id: 'ATT-002', employeeId: 'EMP-001', date: '2026-08-05', checkIn: '09:00 AM', checkOut: '06:15 PM', hoursWorked: '9h 15m', status: 'OnTime' as const, location: 'Bengaluru HQ' },
    { id: 'ATT-003', employeeId: 'EMP-001', date: '2026-08-04', checkIn: '09:35 AM', checkOut: '06:30 PM', hoursWorked: '8h 55m', status: 'Late' as const, location: 'Bengaluru HQ' },
    { id: 'ATT-004', employeeId: 'EMP-001', date: '2026-08-03', checkIn: '08:55 AM', checkOut: '05:45 PM', hoursWorked: '8h 50m', status: 'OnTime' as const, location: 'Work from Home' },
    { id: 'ATT-005', employeeId: 'EMP-001', date: '2026-07-31', checkIn: '09:10 AM', checkOut: '06:00 PM', hoursWorked: '8h 50m', status: 'OnTime' as const, location: 'Bengaluru HQ' },
    { id: 'ATT-006', employeeId: 'EMP-001', date: '2026-07-30', checkIn: '09:05 AM', checkOut: '01:30 PM', hoursWorked: '4h 25m', status: 'HalfDay' as const, location: 'Bengaluru HQ' },
  ];

  for (const log of attendanceLogs) {
    await prisma.attendanceRecord.upsert({
      where: { id: log.id },
      update: log,
      create: log,
    });
  }

  // --------------------------------------------------------------------------
  // 4. SEED LEAVE REQUESTS
  // --------------------------------------------------------------------------
  console.log('Creating leave requests...');
  const leaveRequests = [
    { id: 'LR-101', employeeId: 'EMP-007', leaveType: 'Earned' as const, startDate: '2026-08-10', endDate: '2026-08-14', days: 5, reason: 'Annual family visit to Kerala', status: 'Pending' as const, appliedOn: '2026-08-04' },
    { id: 'LR-102', employeeId: 'EMP-003', leaveType: 'Sick' as const, startDate: '2026-08-07', endDate: '2026-08-07', days: 1, reason: 'Dental appointment & wisdom tooth recovery', status: 'Pending' as const, appliedOn: '2026-08-05' },
    { id: 'LR-103', employeeId: 'EMP-001', leaveType: 'Casual' as const, startDate: '2026-07-20', endDate: '2026-07-21', days: 2, reason: 'Personal home relocation work', status: 'Approved' as const, appliedOn: '2026-07-15', reviewerId: 'EMP-002' },
    { id: 'LR-104', employeeId: 'EMP-005', leaveType: 'WFH' as const, startDate: '2026-08-01', endDate: '2026-08-02', days: 2, reason: 'Internet upgrade & maintenance at residence', status: 'Approved' as const, appliedOn: '2026-07-28', reviewerId: 'EMP-002' },
  ];

  for (const lr of leaveRequests) {
    await prisma.leaveRequest.upsert({
      where: { id: lr.id },
      update: lr,
      create: lr,
    });
  }

  // --------------------------------------------------------------------------
  // 5. SEED MANAGED TEAMS & MEMBERS
  // --------------------------------------------------------------------------
  console.log('Creating managed teams...');
  const teams = [
    {
      id: 'TEAM-PLATFORM',
      name: 'Experience Platform',
      department: 'Engineering',
      managerId: 'EMP-002',
      leaderId: 'EMP-003',
      focus: 'Design system adoption, accessibility, and employee experience delivery',
      members: ['EMP-001', 'EMP-010'],
    },
    {
      id: 'TEAM-SERVICES',
      name: 'Core Services',
      department: 'Engineering',
      managerId: 'EMP-002',
      leaderId: 'EMP-005',
      focus: 'Reliable payroll, attendance, and people-platform services',
      members: ['EMP-011'],
    },
    {
      id: 'TEAM-AI',
      name: 'AI Enablement',
      department: 'AI/ML',
      managerId: 'EMP-002',
      leaderId: 'EMP-009',
      focus: 'Production ML capabilities and responsible workforce insights',
      members: ['EMP-012'],
    },
  ];

  for (const team of teams) {
    const { members, ...teamData } = team;
    await prisma.managedTeam.upsert({
      where: { id: team.id },
      update: teamData,
      create: teamData,
    });

    for (const memberId of members) {
      await prisma.teamMember.upsert({
        where: {
          teamId_employeeId: {
            teamId: team.id,
            employeeId: memberId,
          },
        },
        update: {},
        create: {
          teamId: team.id,
          employeeId: memberId,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 6. SEED TEAM MEMBER METADATA
  // --------------------------------------------------------------------------
  console.log('Creating team member metadata...');
  const teamMetadata = [
    {
      employeeId: 'EMP-001',
      managerId: 'EMP-002',
      focus: 'ML model monitoring and HRMS onboarding insights',
      workload: 72,
      goalProgress: 68,
      goalLabel: 'Ship onboarding analytics beta',
      nextOneToOne: '12 Aug 2026',
      risk: 'OnTrack' as const,
      notes: 'Pair with Rahul on the new dashboard data contract.',
    },
    {
      employeeId: 'EMP-003',
      managerId: 'EMP-002',
      focus: 'Frontend platform and accessibility improvements',
      workload: 88,
      goalProgress: 82,
      goalLabel: 'Complete design system migration',
      nextOneToOne: '10 Aug 2026',
      risk: 'NeedsAttention' as const,
      notes: 'Review sprint scope after the current release candidate.',
    },
    {
      employeeId: 'EMP-005',
      managerId: 'EMP-002',
      focus: 'Payroll services reliability and API performance',
      workload: 61,
      goalProgress: 74,
      goalLabel: 'Reduce payroll API p95 latency',
      nextOneToOne: '14 Aug 2026',
      risk: 'OnTrack' as const,
      notes: 'Share the incident follow-up with the platform team.',
    },
    {
      employeeId: 'EMP-009',
      managerId: 'EMP-002',
      focus: 'AI platform roadmap and responsible model delivery',
      workload: 79,
      goalProgress: 71,
      goalLabel: 'Launch model governance controls',
      nextOneToOne: '13 Aug 2026',
      risk: 'OnTrack' as const,
      notes: 'Align the next model review with Security and People Operations.',
    },
  ];

  for (const meta of teamMetadata) {
    await prisma.teamMemberMetadata.upsert({
      where: {
        employeeId_managerId: {
          employeeId: meta.employeeId,
          managerId: meta.managerId,
        },
      },
      update: meta,
      create: meta,
    });
  }

  // --------------------------------------------------------------------------
  // 7. SEED MEETINGS
  // --------------------------------------------------------------------------
  console.log('Creating meetings & invitations...');
  const meetings = [
    {
      id: 'MTG-001',
      title: 'AI Platform Sprint Planning',
      type: 'TEAM' as const,
      description: 'Align on sprint scope, model evaluation milestones, and delivery owners.',
      startsAt: new Date('2026-08-08T10:00:00+05:30'),
      endsAt: new Date('2026-08-08T11:00:00+05:30'),
      allDay: false,
      location: 'Bengaluru HQ, War Room 2',
      videoLink: 'https://meet.company.com/ai-platform-sprint',
      organizerId: 'EMP-002',
      department: 'AI/ML',
      recurrence: 'WEEKLY' as const,
      reminderMinutes: 15,
      status: 'UPCOMING' as const,
      attendees: [
        { employeeId: 'EMP-001', rsvp: 'ACCEPTED' as const },
        { employeeId: 'EMP-003', rsvp: 'PENDING' as const },
        { employeeId: 'EMP-004', rsvp: 'PENDING' as const },
      ],
    },
    {
      id: 'MTG-002',
      title: 'Independence Day Office Closure',
      type: 'ORG_EVENT' as const,
      description: 'Company holiday across all India offices.',
      startsAt: new Date('2026-08-15T00:00:00+05:30'),
      endsAt: new Date('2026-08-15T23:59:59+05:30'),
      allDay: true,
      organizerId: 'EMP-006',
      recurrence: 'NONE' as const,
      status: 'UPCOMING' as const,
      attendees: [],
    },
    {
      id: 'MTG-003',
      title: 'Product Design Critique',
      type: 'TEAM' as const,
      description: 'Review the employee self-service calendar flows before handoff.',
      startsAt: new Date('2026-08-10T14:30:00+05:30'),
      endsAt: new Date('2026-08-10T15:30:00+05:30'),
      allDay: false,
      location: 'Google Meet',
      videoLink: 'https://meet.company.com/design-critique',
      organizerId: 'EMP-004',
      department: 'Design',
      recurrence: 'NONE' as const,
      status: 'UPCOMING' as const,
      attendees: [
        { employeeId: 'EMP-001', rsvp: 'PENDING' as const },
        { employeeId: 'EMP-005', rsvp: 'PENDING' as const },
      ],
    },
  ];

  for (const m of meetings) {
    const { attendees, ...meetingData } = m;
    await prisma.meeting.upsert({
      where: { id: m.id },
      update: meetingData,
      create: meetingData,
    });

    for (const att of attendees) {
      await prisma.meetingAttendee.upsert({
        where: {
          meetingId_employeeId: {
            meetingId: m.id,
            employeeId: att.employeeId,
          },
        },
        update: att,
        create: {
          meetingId: m.id,
          employeeId: att.employeeId,
          rsvp: att.rsvp,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 8. SEED PAYSLIPS
  // --------------------------------------------------------------------------
  console.log('Creating payslips...');
  const payslips = [
    {
      id: 'PAY-2026-07',
      employeeId: 'EMP-001',
      monthYear: 'July 2026',
      basicSalary: 55000,
      hra: 22000,
      conveyance: 5000,
      specialAllowance: 13833,
      pfDeduction: 6600,
      taxDeduction: 13400,
      grossEarnings: 95833,
      totalDeductions: 20000,
      netPayable: 75833,
      paymentDate: '31 July 2026',
      status: 'Paid' as const,
    },
    {
      id: 'PAY-2026-06',
      employeeId: 'EMP-001',
      monthYear: 'June 2026',
      basicSalary: 55000,
      hra: 22000,
      conveyance: 5000,
      specialAllowance: 13833,
      pfDeduction: 6600,
      taxDeduction: 13400,
      grossEarnings: 95833,
      totalDeductions: 20000,
      netPayable: 75833,
      paymentDate: '30 June 2026',
      status: 'Paid' as const,
    },
    {
      id: 'PAY-2026-05',
      employeeId: 'EMP-001',
      monthYear: 'May 2026',
      basicSalary: 55000,
      hra: 22000,
      conveyance: 5000,
      specialAllowance: 13833,
      pfDeduction: 6600,
      taxDeduction: 13400,
      grossEarnings: 95833,
      totalDeductions: 20000,
      netPayable: 75833,
      paymentDate: '31 May 2026',
      status: 'Paid' as const,
    },
  ];

  for (const slip of payslips) {
    await prisma.payslip.upsert({
      where: { id: slip.id },
      update: slip,
      create: slip,
    });
  }

  // --------------------------------------------------------------------------
  // 9. SEED KRAs
  // --------------------------------------------------------------------------
  console.log('Creating KRAs...');
  const kras = [
    {
      id: 'KRA-1042',
      title: 'Improve employee attrition prediction model',
      description: 'Enhance the existing attrition-risk model and prepare it for controlled HR analytics testing.',
      keyResult: 'Achieve at least 88% validation accuracy while keeping false positives below 12%.',
      category: 'AI/ML Delivery',
      assignedToId: 'EMP-001',
      assignedById: 'EMP-002',
      assignedOn: '01 Aug 2026',
      dueDate: '20 Aug 2026',
      priority: 'Critical' as const,
      status: 'InProgress' as const,
      progress: 72,
      weightage: 30,
      lastUpdate: 'Feature engineering completed; validating class-balanced model variants.',
      deliverables: ['Cleaned training dataset', 'Model evaluation report', 'Inference notebook and handover notes'],
    },
    {
      id: 'KRA-1038',
      title: 'Build resume-to-JD matching prototype',
      description: 'Create a frontend-ready scoring service prototype for the recruitment screening workflow.',
      keyResult: 'Return an explainable match score, matched skills, missing skills, and candidate summary.',
      category: 'Product Innovation',
      assignedToId: 'EMP-001',
      assignedById: 'EMP-006',
      assignedOn: '28 Jul 2026',
      dueDate: '28 Aug 2026',
      priority: 'High' as const,
      status: 'InProgress' as const,
      progress: 48,
      weightage: 25,
      lastUpdate: 'Completed skill extraction; working on weighted JD criteria.',
      deliverables: ['Matching logic prototype', 'Sample API response schema', 'Accuracy test with 25 sample resumes'],
    },
  ];

  for (const kra of kras) {
    await prisma.performanceKra.upsert({
      where: { id: kra.id },
      update: kra,
      create: kra,
    });
  }

  // --------------------------------------------------------------------------
  // 10. SEED ASSETS
  // --------------------------------------------------------------------------
  console.log('Creating assets...');
  const assets = [
    { id: 'AST-001', assetTag: 'APX-LT-1042', category: 'Laptop' as const, name: 'MacBook Pro 14-inch', brand: 'Apple', model: 'M3 Pro / 18GB / 512GB', serialNumber: 'C02X7A1QMD6T', purchaseDate: '12 Jan 2026', purchaseCost: '₹1,84,900', warrantyUntil: '11 Jan 2029', status: 'Assigned' as const, assignedToId: 'EMP-001', location: 'Bengaluru Office', condition: 'Good' as const, lastChecked: '08 Aug 2026', notes: 'Primary development machine. VPN and endpoint security enabled.' },
    { id: 'AST-002', assetTag: 'APX-LT-1031', category: 'Laptop' as const, name: 'ThinkPad X1 Carbon', brand: 'Lenovo', model: 'Gen 11 / 16GB / 1TB', serialNumber: 'PF4K8M2L', purchaseDate: '05 Nov 2025', purchaseCost: '₹1,32,500', warrantyUntil: '04 Nov 2028', status: 'Assigned' as const, assignedToId: 'EMP-002', location: 'Bengaluru Office', condition: 'Good' as const, lastChecked: '01 Aug 2026', notes: 'Manager device with docking station.' },
    { id: 'AST-003', assetTag: 'APX-MN-2088', category: 'Monitor' as const, name: 'UltraSharp 27 Monitor', brand: 'Dell', model: 'U2723QE 4K USB-C', serialNumber: 'CN0U2723ABC', purchaseDate: '22 Feb 2026', purchaseCost: '₹48,000', warrantyUntil: '21 Feb 2029', status: 'Available' as const, assignedToId: null, location: 'IT Store - Bengaluru', condition: 'New' as const, lastChecked: '05 Aug 2026', notes: 'Ready for the next onboarding batch.' },
  ];

  for (const ast of assets) {
    await prisma.asset.upsert({
      where: { id: ast.id },
      update: ast,
      create: ast,
    });
  }

  // --------------------------------------------------------------------------
  // 11. SEED RECRUITMENT JOBS & CANDIDATES
  // --------------------------------------------------------------------------
  console.log('Creating recruitment jobs & candidates...');
  const jobs = [
    {
      id: 'JOB-001',
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      location: 'Bengaluru / Hybrid',
      employmentType: 'FullTime' as const,
      openings: 2,
      applicants: 24,
      status: 'Open' as const,
      postedOn: '01 Aug 2026',
      description: 'Build accessible, high-performance experiences for the MYLOTIC GROUP HR platform.',
      requirements: ['React', 'TypeScript', 'Next.js', 'Testing', 'System design'],
    },
    {
      id: 'JOB-002',
      title: 'AI/ML Engineer',
      department: 'AI/ML',
      location: 'Bengaluru / Remote',
      employmentType: 'FullTime' as const,
      openings: 1,
      applicants: 18,
      status: 'Open' as const,
      postedOn: '28 Jul 2026',
      description: 'Develop practical ML systems that improve people operations and employee insights.',
      requirements: ['Python', 'Machine learning', 'SQL', 'Model deployment', 'Experimentation'],
    },
  ];

  for (const j of jobs) {
    await prisma.recruitmentJob.upsert({
      where: { id: j.id },
      update: j,
      create: j,
    });
  }

  const candidates = [
    {
      id: 'CAN-001',
      jobId: 'JOB-001',
      name: 'Kavya Menon',
      email: 'kavya.menon@email.com',
      phone: '+91 98450 12345',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      appliedOn: '06 Aug 2026',
      stage: 'Screening' as const,
      score: 92,
      experience: '6 years',
      currentRole: 'Senior UI Engineer at Fintech Labs',
      location: 'Bengaluru, Karnataka',
      matchedSkills: ['React', 'TypeScript', 'Next.js', 'Testing'],
      missingSkills: ['System design evidence'],
      summary: 'Strong product engineering background with measurable accessibility and performance improvements.',
      recommendation: 'StrongMatch' as const,
    },
    {
      id: 'CAN-002',
      jobId: 'JOB-001',
      name: 'Aditya Kulkarni',
      email: 'aditya.k@email.com',
      phone: '+91 98220 22556',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      appliedOn: '05 Aug 2026',
      stage: 'Interview' as const,
      score: 84,
      experience: '5 years',
      currentRole: 'Frontend Developer at Orbit Systems',
      location: 'Pune, Maharashtra',
      matchedSkills: ['React', 'TypeScript', 'Testing'],
      missingSkills: ['Next.js depth'],
      summary: 'Solid frontend fundamentals and delivery experience; validate architecture ownership during interview.',
      recommendation: 'StrongMatch' as const,
    },
  ];

  for (const c of candidates) {
    await prisma.recruitmentCandidate.upsert({
      where: { id: c.id },
      update: c,
      create: c,
    });
  }

  // --------------------------------------------------------------------------
  // 12. SEED POLICIES
  // --------------------------------------------------------------------------
  console.log('Creating company policies...');
  const policies = [
    {
      id: 'POL-001',
      title: 'Code of Conduct and Ethics',
      summary: 'Standards for professional conduct, conflicts of interest, and responsible decision-making at MYLOTIC GROUP PVT.LTD.',
      category: 'CodeOfConduct' as const,
      version: 'v3.2',
      effectiveDate: '01 Aug 2026',
      updatedOn: '01 Aug 2026',
      uploadedById: 'EMP-006',
      mandatory: true,
      acknowledgementRequired: true,
      fileName: 'code-of-conduct-v3.2.pdf',
      fileSize: '1.2 MB',
    },
    {
      id: 'POL-002',
      title: 'Leave and Attendance Policy',
      summary: 'Guidance on working hours, attendance, leave types, late arrival permissions, and attendance corrections.',
      category: 'LeaveAndAttendance' as const,
      version: 'v2.4',
      effectiveDate: '15 Jul 2026',
      updatedOn: '15 Jul 2026',
      uploadedById: 'EMP-006',
      mandatory: true,
      acknowledgementRequired: true,
      fileName: 'leave-attendance-policy-v2.4.pdf',
      fileSize: '980 KB',
    },
  ];

  for (const pol of policies) {
    await prisma.companyPolicy.upsert({
      where: { id: pol.id },
      update: pol,
      create: pol,
    });
  }

  // --------------------------------------------------------------------------
  // 13. SEED DOCUMENTS
  // --------------------------------------------------------------------------
  console.log('Creating employee documents & requests...');
  const docs = [
    {
      id: 'DOC-204',
      employeeId: 'EMP-001',
      name: 'Aadhaar Card.pdf',
      type: 'Identity Proof',
      uploadedOn: '02 Aug 2026',
      size: '1.8 MB',
      status: 'Verified' as const,
      note: 'Identity proof verified by HR Operations.',
    },
    {
      id: 'DOC-201',
      employeeId: 'EMP-001',
      name: 'Internship Agreement.pdf',
      type: 'Employment Document',
      uploadedOn: '15 Jul 2026',
      size: '920 KB',
      status: 'UnderReview' as const,
      note: 'HR is checking the signed agreement.',
    },
  ];

  for (const d of docs) {
    await prisma.employeeDocument.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }

  console.log('✅ PostgreSQL Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
