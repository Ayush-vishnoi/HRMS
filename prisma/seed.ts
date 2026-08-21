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

  // --------------------------------------------------------------------------
  // 14. SEED SALARY STRUCTURES & PAYROLL ENGINE
  // --------------------------------------------------------------------------
  console.log('Creating salary structures & payroll cycle...');
  const salaryStructures = [
    {
      id: 'sal-emp-001',
      employeeId: 'EMP-001',
      ctcAnnual: 550000,
      basicMonthly: 22917,
      hraMonthly: 11458,
      conveyanceMonthly: 1600,
      specialAllowanceMonthly: 8058,
      medicalAllowanceMonthly: 1250,
      pfEmployerMonthly: 1800,
      pfEmployeeMonthly: 1800,
      ptMonthly: 200,
      effectiveFrom: '2026-04-01',
      isActive: true,
    },
    {
      id: 'sal-emp-002',
      employeeId: 'EMP-002',
      ctcAnnual: 3200000,
      basicMonthly: 133333,
      hraMonthly: 66667,
      conveyanceMonthly: 1600,
      specialAllowanceMonthly: 59733,
      medicalAllowanceMonthly: 1250,
      pfEmployerMonthly: 1800,
      pfEmployeeMonthly: 1800,
      ptMonthly: 200,
      effectiveFrom: '2026-04-01',
      isActive: true,
    },
    {
      id: 'sal-emp-006',
      employeeId: 'EMP-006',
      ctcAnnual: 3600000,
      basicMonthly: 150000,
      hraMonthly: 75000,
      conveyanceMonthly: 1600,
      specialAllowanceMonthly: 67400,
      medicalAllowanceMonthly: 1250,
      pfEmployerMonthly: 1800,
      pfEmployeeMonthly: 1800,
      ptMonthly: 200,
      effectiveFrom: '2026-04-01',
      isActive: true,
    },
  ];

  for (const s of salaryStructures) {
    await prisma.salaryStructure.upsert({
      where: { employeeId: s.employeeId },
      update: s,
      create: s,
    });
  }

  const cycle = await prisma.payrollCycle.upsert({
    where: { monthYear: 'August 2026' },
    update: {
      cycleStartDate: '2026-08-01',
      cycleEndDate: '2026-08-31',
      totalEmployees: 19,
      totalGross: 2450000,
      totalDeductions: 285000,
      totalNetPayable: 2165000,
      status: 'Approved',
      country: 'IN',
      currency: 'INR',
    },
    create: {
      id: 'cycle-2026-08',
      monthYear: 'August 2026',
      cycleStartDate: '2026-08-01',
      cycleEndDate: '2026-08-31',
      totalEmployees: 19,
      totalGross: 2450000,
      totalDeductions: 285000,
      totalNetPayable: 2165000,
      status: 'Approved',
      country: 'IN',
      currency: 'INR',
    },
  });

  const cycleItems = [
    {
      id: 'item-emp-001',
      cycleId: cycle.id,
      employeeId: 'EMP-001',
      employeeCode: 'EMP-2026-089',
      employeeName: 'Ayush Vishnoi',
      department: 'AI/ML',
      basic: 22917,
      hra: 11458,
      conveyance: 1600,
      specialAllowance: 8058,
      grossEarnings: 44033,
      pfEmployee: 1800,
      esicEmployee: 0,
      pt: 200,
      tds: 1500,
      totalDeductions: 3500,
      netPayable: 40533,
      paymentStatus: 'Processed',
    },
    {
      id: 'item-emp-002',
      cycleId: cycle.id,
      employeeId: 'EMP-002',
      employeeCode: 'EMP-2019-012',
      employeeName: 'Arjun Mehta',
      department: 'Engineering',
      basic: 133333,
      hra: 66667,
      conveyance: 1600,
      specialAllowance: 59733,
      grossEarnings: 261333,
      pfEmployee: 1800,
      esicEmployee: 0,
      pt: 200,
      tds: 38000,
      totalDeductions: 40000,
      netPayable: 221333,
      paymentStatus: 'Processed',
    },
  ];

  for (const item of cycleItems) {
    await prisma.payrollCycleItem.upsert({
      where: {
        cycleId_employeeId: {
          cycleId: item.cycleId,
          employeeId: item.employeeId,
        },
      },
      update: item,
      create: item,
    });
  }

  // --------------------------------------------------------------------------
  // 15. SEED EXPENSES & REIMBURSEMENTS
  // --------------------------------------------------------------------------
  console.log('Creating expense claims...');
  const expenses = [
    {
      id: 'EXP-801',
      claimNumber: 'EXP-2026-001',
      employeeId: 'EMP-001',
      title: 'Client Meeting Cab & Travel',
      category: 'Cab',
      amount: 850,
      currency: 'INR',
      expenseDate: '2026-08-10',
      merchantName: 'Uber India',
      description: 'Travel from HQ to Client Campus for Architecture Review',
      managerStatus: 'Approved',
      financeStatus: 'Approved',
      paymentStatus: 'SettledInPayroll',
      approvedAmount: 850,
      settlementDate: '2026-08-14',
    },
    {
      id: 'EXP-802',
      claimNumber: 'EXP-2026-002',
      employeeId: 'EMP-001',
      title: 'Monthly Broadband / WFH Allowance',
      category: 'Internet',
      amount: 1499,
      currency: 'INR',
      expenseDate: '2026-08-01',
      merchantName: 'Airtel Xstream Fiber',
      description: 'High-speed internet for remote development tasks',
      managerStatus: 'Approved',
      financeStatus: 'Pending',
      paymentStatus: 'Pending',
    },
  ];

  for (const exp of expenses) {
    await prisma.expenseClaim.upsert({
      where: { claimNumber: exp.claimNumber },
      update: exp,
      create: exp,
    });
  }

  // --------------------------------------------------------------------------
  // 16. SEED BENEFITS & INSURANCE
  // --------------------------------------------------------------------------
  console.log('Creating benefit plans & enrollments...');
  const plan = await prisma.benefitPlan.upsert({
    where: { id: 'BEN-001' },
    update: {
      name: 'Comprehensive Corporate Health Shield',
      planType: 'HealthInsurance',
      provider: 'Star Health & Allied Insurance',
      coverageAmount: 1000000,
      annualPremium: 24000,
      companyContribution: 100,
      employeeContribution: 0,
      description: 'Cashless hospitalisation across 14,000+ network hospitals in India.',
      isActive: true,
    },
    create: {
      id: 'BEN-001',
      name: 'Comprehensive Corporate Health Shield',
      planType: 'HealthInsurance',
      provider: 'Star Health & Allied Insurance',
      coverageAmount: 1000000,
      annualPremium: 24000,
      companyContribution: 100,
      employeeContribution: 0,
      description: 'Cashless hospitalisation across 14,000+ network hospitals in India.',
      isActive: true,
    },
  });

  const enrollment = await prisma.employeeBenefitEnrollment.upsert({
    where: { id: 'ENR-001' },
    update: {
      employeeId: 'EMP-001',
      benefitPlanId: plan.id,
      enrollmentDate: '2026-03-15',
      coverageStartDate: '2026-04-01',
      coverageEndDate: '2027-03-31',
      status: 'Active',
    },
    create: {
      id: 'ENR-001',
      employeeId: 'EMP-001',
      benefitPlanId: plan.id,
      enrollmentDate: '2026-03-15',
      coverageStartDate: '2026-04-01',
      coverageEndDate: '2027-03-31',
      status: 'Active',
    },
  });

  // --------------------------------------------------------------------------
  // 17. SEED TRAINING & LMS
  // --------------------------------------------------------------------------
  console.log('Creating LMS courses & modules...');
  const course1 = await prisma.lmsCourse.upsert({
    where: { id: 'CRS-101' },
    update: {
      title: 'POSH Act Compliance 2026: Prevention of Sexual Harassment',
      category: 'POSH',
      description: 'Mandatory annual workplace safety and compliance training program.',
      durationHours: 1.5,
      level: 'Beginner',
      isMandatory: true,
      passingPercentage: 80,
    },
    create: {
      id: 'CRS-101',
      title: 'POSH Act Compliance 2026: Prevention of Sexual Harassment',
      category: 'POSH',
      description: 'Mandatory annual workplace safety and compliance training program.',
      durationHours: 1.5,
      level: 'Beginner',
      isMandatory: true,
      passingPercentage: 80,
    },
  });

  const course2 = await prisma.lmsCourse.upsert({
    where: { id: 'CRS-102' },
    update: {
      title: 'Full-Stack Architecture with Next.js 16 & Prisma',
      category: 'Technical',
      description: 'Advanced enterprise patterns, server actions, caching, and database pooling.',
      durationHours: 6.0,
      level: 'Advanced',
      isMandatory: false,
      passingPercentage: 75,
    },
    create: {
      id: 'CRS-102',
      title: 'Full-Stack Architecture with Next.js 16 & Prisma',
      category: 'Technical',
      description: 'Advanced enterprise patterns, server actions, caching, and database pooling.',
      durationHours: 6.0,
      level: 'Advanced',
      isMandatory: false,
      passingPercentage: 75,
    },
  });

  await prisma.employeeCourseEnrollment.upsert({
    where: {
      employeeId_courseId: {
        employeeId: 'EMP-001',
        courseId: course1.id,
      },
    },
    update: {
      dueDate: '2026-08-30',
      progressPercentage: 100,
      status: 'Completed',
      completionDate: '2026-08-12',
      scorePercentage: 95,
      certificateUrl: '/certificates/cert-posh-emp-001.pdf',
    },
    create: {
      id: 'ENRL-CRS-101',
      employeeId: 'EMP-001',
      courseId: course1.id,
      dueDate: '2026-08-30',
      progressPercentage: 100,
      status: 'Completed',
      completionDate: '2026-08-12',
      scorePercentage: 95,
      certificateUrl: '/certificates/cert-posh-emp-001.pdf',
    },
  });

  // --------------------------------------------------------------------------
  // 18. SEED SKILLS INTELLIGENCE
  // --------------------------------------------------------------------------
  console.log('Creating skills taxonomy & employee skills...');
  const skillsData = [
    { id: 'SKL-001', name: 'TypeScript & Next.js', category: 'Engineering' },
    { id: 'SKL-002', name: 'PostgreSQL & Prisma ORM', category: 'Engineering' },
    { id: 'SKL-003', name: 'AI & LLM Architecture', category: 'AI/ML' },
    { id: 'SKL-004', name: 'HR Operations & Compliance', category: 'Human Resources' },
  ];

  for (const s of skillsData) {
    const createdSkill = await prisma.skillMaster.upsert({
      where: { name: s.name },
      update: s,
      create: s,
    });

    if (s.name === 'TypeScript & Next.js' || s.name === 'AI & LLM Architecture') {
      await prisma.employeeSkill.upsert({
        where: {
          employeeId_skillId: {
            employeeId: 'EMP-001',
            skillId: createdSkill.id,
          },
        },
        update: { proficiency: 'Advanced', yearsExp: 3.5, verified: true },
        create: {
          id: `emp-skl-${s.id}`,
          employeeId: 'EMP-001',
          skillId: createdSkill.id,
          proficiency: 'Advanced',
          yearsExp: 3.5,
          verified: true,
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 19. SEED EMPLOYEE ENGAGEMENT & FEED
  // --------------------------------------------------------------------------
  console.log('Creating employee engagement & social feed...');
  await prisma.engagementFeedPost.upsert({
    where: { id: 'POST-001' },
    update: {
      authorId: 'EMP-006',
      authorName: 'Priya Sharma',
      postType: 'Announcement',
      title: '🎉 Welcome to Q3 2026 All-Hands & Product Innovation Awards!',
      content: 'We are thrilled to celebrate outstanding contributions across Engineering, AI, and Product. Join us this Friday at 4:30 PM for our global town hall.',
      pinned: true,
      likesCount: 28,
      commentsCount: 9,
    },
    create: {
      id: 'POST-001',
      authorId: 'EMP-006',
      authorName: 'Priya Sharma',
      postType: 'Announcement',
      title: '🎉 Welcome to Q3 2026 All-Hands & Product Innovation Awards!',
      content: 'We are thrilled to celebrate outstanding contributions across Engineering, AI, and Product. Join us this Friday at 4:30 PM for our global town hall.',
      pinned: true,
      likesCount: 28,
      commentsCount: 9,
    },
  });

  await prisma.employeeRecognition.upsert({
    where: { id: 'REC-001' },
    update: {
      giverId: 'EMP-002',
      giverName: 'Arjun Mehta',
      receiverId: 'EMP-001',
      receiverName: 'Ayush Vishnoi',
      recognitionType: 'Spotlight',
      badgeIcon: '🚀',
      message: 'Exceptional work accelerating the HRMS enterprise transformation architecture!',
      isPublic: true,
      likesCount: 14,
    },
    create: {
      id: 'REC-001',
      giverId: 'EMP-002',
      giverName: 'Arjun Mehta',
      receiverId: 'EMP-001',
      receiverName: 'Ayush Vishnoi',
      recognitionType: 'Spotlight',
      badgeIcon: '🚀',
      message: 'Exceptional work accelerating the HRMS enterprise transformation architecture!',
      isPublic: true,
      likesCount: 14,
    },
  });

  // --------------------------------------------------------------------------
  // 20. SEED NOTIFICATIONS
  // --------------------------------------------------------------------------
  console.log('Creating user notifications...');
  const notifs = [
    {
      id: 'NOTIF-001',
      userId: 'EMP-001',
      title: 'August 2026 Payslip Available',
      message: 'Your monthly salary payslip for August 2026 has been generated and approved.',
      type: 'Approval',
      linkUrl: '/payroll',
      isRead: false,
    },
    {
      id: 'NOTIF-002',
      userId: 'EMP-001',
      title: 'Kudos Received from Arjun Mehta',
      message: 'You received a Spotlight badge for exceptional engineering delivery!',
      type: 'Celebration',
      linkUrl: '/engagement',
      isRead: false,
    },
  ];

  for (const n of notifs) {
    await prisma.userNotification.upsert({
      where: { id: n.id },
      update: n,
      create: n,
    });
  }

  // --------------------------------------------------------------------------
  // 21. SEED LIFECYCLE: SALARY REVISION HISTORY & WARNINGS & KT
  // --------------------------------------------------------------------------
  console.log('Creating salary revision histories...');
  const revisions = [
    {
      id: 'rev-001',
      employeeId: 'EMP-001',
      previousCtcAnnual: 2400000,
      newCtcAnnual: 2800000,
      previousBasicMonthly: 100000,
      newBasicMonthly: 116667,
      previousHraMonthly: 50000,
      newHraMonthly: 58333,
      previousSpecialMonthly: 44750,
      newSpecialMonthly: 52100,
      effectiveDate: '2026-04-01',
      revisionType: 'AnnualIncrement',
      reason: 'FY26 Annual Merit Increment & Performance Exceeds Expectations',
      source: 'AnnualAppraisal',
      approvedById: 'EMP-002',
      approvedAt: new Date('2026-03-25'),
    },
    {
      id: 'rev-002',
      employeeId: 'EMP-001',
      previousCtcAnnual: 2000000,
      newCtcAnnual: 2400000,
      previousBasicMonthly: 83333,
      newBasicMonthly: 100000,
      previousHraMonthly: 41667,
      newHraMonthly: 50000,
      previousSpecialMonthly: 38000,
      newSpecialMonthly: 44750,
      effectiveDate: '2025-10-01',
      revisionType: 'Promotion',
      reason: 'Promotion from SDE-2 to Senior AI Engineer',
      source: 'PromotionWorkflow',
      approvedById: 'EMP-006',
      approvedAt: new Date('2025-09-20'),
    },
  ];

  for (const r of revisions) {
    await prisma.salaryRevisionHistory.upsert({
      where: { id: r.id },
      update: r,
      create: r,
    });
  }

  console.log('Creating employee disciplinary records...');
  const warnings = [
    {
      id: 'warn-001',
      employeeId: 'EMP-003',
      type: 'PolicyViolation',
      severity: 'Medium',
      reason: 'Delayed compliance submission for annual ISO-27001 data handling policy.',
      incidentDate: '2026-07-15',
      issuedById: 'EMP-006',
      issuedByName: 'Priya Sharma (Head of HR)',
      actionRequired: 'Complete and sign policy acknowledgment within 48 hours.',
      isEmployeeVisible: true,
      status: 'Resolved',
    },
  ];

  for (const w of warnings) {
    await prisma.employeeWarning.upsert({
      where: { id: w.id },
      update: w,
      create: w,
    });
  }

  console.log('Creating sample exit request and clearances...');
  const sampleExit = await prisma.exitRequest.upsert({
    where: { id: 'exit-001' },
    update: {
      employeeId: 'EMP-003',
      resignationDate: '2026-08-01',
      requestedRelievingDate: '2026-09-30',
      reasonCategory: 'Career Opportunity',
      reasonDetails: 'Transitioning to an international research laboratory for higher studies.',
      noticePeriodDays: 60,
      status: 'Submitted',
    },
    create: {
      id: 'exit-001',
      employeeId: 'EMP-003',
      resignationDate: '2026-08-01',
      requestedRelievingDate: '2026-09-30',
      reasonCategory: 'Career Opportunity',
      reasonDetails: 'Transitioning to an international research laboratory for higher studies.',
      noticePeriodDays: 60,
      status: 'Submitted',
      clearances: {
        create: [
          { employeeId: 'EMP-003', department: 'IT', status: 'Cleared', remarks: 'All hardware & VPN tokens returned' },
          { employeeId: 'EMP-003', department: 'Finance', status: 'Pending' },
          { employeeId: 'EMP-003', department: 'HR', status: 'Pending' },
          { employeeId: 'EMP-003', department: 'Manager', status: 'Cleared', remarks: 'Knowledge transfer underway' },
          { employeeId: 'EMP-003', department: 'Admin', status: 'Cleared', remarks: 'ID badge surrendered' },
        ],
      },
    },
  });

  console.log('Creating KT handover tasks for sample exit request...');
  const ktTasks = [
    {
      id: 'kt-001',
      exitRequestId: 'exit-001',
      title: 'Infrastructure & AWS Architecture Handover',
      description: 'Transfer admin credentials, Terraform state files, and Kubernetes cluster access to recipient.',
      recipientEmployeeId: 'EMP-002',
      recipientName: 'Arjun Mehta',
      status: 'InProgress',
      dueDate: '2026-08-25',
      notes: 'Initial walkthrough completed; access keys rotated.',
    },
    {
      id: 'kt-002',
      exitRequestId: 'exit-001',
      title: 'Active Sprint & Roadmap Backlog Review',
      description: 'Review pending PRs, JIRA backlog items, and design documents for Q3 deliverables.',
      recipientEmployeeId: 'EMP-001',
      recipientName: 'Ayush Vishnoi',
      status: 'Verified',
      dueDate: '2026-08-20',
      completedAt: new Date('2026-08-19'),
      verifiedById: 'EMP-002',
      verifiedAt: new Date('2026-08-20'),
      notes: 'Completed in sprint handover meeting.',
    },
  ];

  for (const kt of ktTasks) {
    await prisma.knowledgeTransferTask.upsert({
      where: { id: kt.id },
      update: kt,
      create: kt,
    });
  }

  // --------------------------------------------------------------------------
  // 14. SEED PHASE 3: PERFORMANCE, TALENT & CAREER MANAGEMENT
  // --------------------------------------------------------------------------
  console.log('Seeding Phase 3: Performance, Talent & Career Management...');
  console.log('  -> Ensuring default organization exists...');
  await prisma.organizations.upsert({
    where: { id: 'org_default' },
    update: {},
    create: {
      id: 'org_default',
      name: 'HRMS Enterprise Corp',
      code: 'ORG-CORP-01',
      legal_name: 'HRMS Enterprise Private Limited',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log('  -> Seeding Performance Review Cycle...');
  const cycleId = 'CYCLE-2026-Q3';
  await prisma.performance_review_cycles.upsert({
    where: { id: cycleId },
    update: {
      name: 'Q3 2026 Enterprise Growth & Performance Cycle',
      description: 'Quarterly OKR evaluation, 360° feedback, competency assessment, and talent calibration.',
      review_period: 'Quarterly',
      status: 'Active',
      goal_setting_deadline: new Date('2026-07-15'),
      self_review_deadline: new Date('2026-08-30'),
      manager_review_deadline: new Date('2026-09-15'),
      calibration_date: new Date('2026-09-20'),
      scoring_weights: { goals: 40, kpis: 30, competencies: 20, feedback: 10 },
      is_locked: false,
    },
    create: {
      id: cycleId,
      organization_id: 'org_default',
      name: 'Q3 2026 Enterprise Growth & Performance Cycle',
      description: 'Quarterly OKR evaluation, 360° feedback, competency assessment, and talent calibration.',
      review_period: 'Quarterly',
      start_date: new Date('2026-07-01'),
      end_date: new Date('2026-09-30'),
      status: 'Active',
      goal_setting_deadline: new Date('2026-07-15'),
      self_review_deadline: new Date('2026-08-30'),
      manager_review_deadline: new Date('2026-09-15'),
      calibration_date: new Date('2026-09-20'),
      scoring_weights: { goals: 40, kpis: 30, competencies: 20, feedback: 10 },
      created_by_id: 'EMP-006',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // B. Company-Wide Objective (Parent Goal)
  const orgGoalId = 'GOAL-ORG-2026-01';
  await prisma.performanceGoal.upsert({
    where: { id: orgGoalId },
    update: {
      progress: 75,
      cycle_id: cycleId,
    },
    create: {
      id: orgGoalId,
      organization_id: 'org_default',
      created_by_id: 'EMP-006',
      type: 'OKR',
      scope: 'Organization',
      title: 'Drive 99.99% Platform Reliability & Next-Gen HRMS Intelligence',
      description: 'Company-wide strategic bet to establish automated workforce management and high-availability operations.',
      weightage: 30,
      progress: 75,
      cycle_id: cycleId,
      start_date: new Date('2026-07-01'),
      due_date: new Date('2026-09-30'),
      status: 'Active',
    },
  });

  // C. Cascaded Team Objective
  const teamGoalId = 'GOAL-TEAM-ENG-01';
  await prisma.performanceGoal.upsert({
    where: { id: teamGoalId },
    update: {
      progress: 80,
      cycle_id: cycleId,
    },
    create: {
      id: teamGoalId,
      organization_id: 'org_default',
      owner_employee_id: 'EMP-002',
      parentGoalId: orgGoalId,
      created_by_id: 'EMP-002',
      type: 'OKR',
      scope: 'Team',
      title: 'Architect Distributed AI Agent Toolchains & Zero-Downtime Releases',
      description: 'Deliver Phase 3 Performance and Talent ecosystem with robust audit logging and test coverage.',
      weightage: 40,
      progress: 80,
      cycle_id: cycleId,
      start_date: new Date('2026-07-01'),
      due_date: new Date('2026-09-30'),
      status: 'Active',
    },
  });

  // D. Individual Cascaded Objective for Ayush Vishnoi
  const empGoalId = 'GOAL-EMP-001-01';
  const empGoal = await prisma.performanceGoal.upsert({
    where: { id: empGoalId },
    update: {
      progress: 85,
      cycle_id: cycleId,
    },
    create: {
      id: empGoalId,
      organization_id: 'org_default',
      owner_employee_id: 'EMP-001',
      parentGoalId: teamGoalId,
      created_by_id: 'EMP-002',
      type: 'OKR',
      scope: 'Individual',
      title: 'Implement Multi-Dimensional Performance & Skills Intelligence Engine',
      description: 'Build complete OKR cascading, deterministic scoring, and seamless LMS learning recommendations.',
      weightage: 50,
      progress: 85,
      cycle_id: cycleId,
      start_date: new Date('2026-07-01'),
      due_date: new Date('2026-09-30'),
      status: 'Active',
    },
  });

  // Key Results for empGoal
  await prisma.performance_key_results.deleteMany({ where: { goal_id: empGoal.id } });
  const kr1 = await prisma.performance_key_results.create({
    data: {
      goal_id: empGoal.id,
      title: 'Deliver 100% test coverage across 21 Phase 3 talent workflows',
      metric: 'Automated Test Scenarios Passed',
      target_value: 21,
      current_value: 21,
      unit: 'Scenarios',
      weightage: 50,
      progress: 100,
      status: 'Active',
    },
  });

  const kr2 = await prisma.performance_key_results.create({
    data: {
      goal_id: empGoal.id,
      title: 'Complete skills gap analysis integration with LMS training catalog',
      metric: 'Integration Completion %',
      target_value: 100,
      current_value: 80,
      unit: '%',
      weightage: 50,
      progress: 80,
      status: 'Active',
    },
  });

  // E. Data-Driven KPIs
  await prisma.performance_kpis.createMany({
    data: [
      {
        id: 'KPI-EMP-001-ATT',
        organization_id: 'org_default',
        employee_id: 'EMP-001',
        cycle_id: cycleId,
        name: 'Attendance & Punctuality Rate',
        description: 'Percentage of on-time check-ins over the quarterly review period',
        metric: 'On-time attendance rate',
        target: 95,
        actual: 98,
        unit: '%',
        weightage: 20,
        frequency: 'Quarterly',
        source_module: 'Attendance',
        is_system_calculated: true,
        calculation_metadata: { onTimeDays: 29, totalDays: 30 },
        last_calculated_at: new Date(),
      },
      {
        id: 'KPI-EMP-001-LMS',
        organization_id: 'org_default',
        employee_id: 'EMP-001',
        cycle_id: cycleId,
        name: 'Mandatory Compliance & LMS Training',
        description: 'Percentage of assigned corporate learning courses completed',
        metric: 'Course Completion Rate',
        target: 100,
        actual: 100,
        unit: '%',
        weightage: 20,
        frequency: 'Quarterly',
        source_module: 'LMS',
        is_system_calculated: true,
        calculation_metadata: { completedCount: 3, totalAssigned: 3 },
        last_calculated_at: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // F. Core Competencies
  const competencyList = [
    { name: 'Technical Expertise & Craft', desc: 'Demonstrates deep domain knowledge, code quality, and system architecture.' },
    { name: 'Problem Solving & Critical Thinking', desc: 'Analyzes ambiguous challenges, diagnoses root causes, and delivers robust fixes.' },
    { name: 'Communication & Stakeholder Alignment', desc: 'Articulates technical choices clearly and aligns cross-functional partners.' },
    { name: 'Collaboration & Teamwork', desc: 'Actively supports peers, conducts thorough code reviews, and unblocks blockers.' },
    { name: 'Leadership & Mentorship', desc: 'Empowers teammates, shares best practices, and sets high engineering standards.' },
    { name: 'Ownership & Accountability', desc: 'Takes end-to-end responsibility for production outcomes and reliable delivery.' },
    { name: 'Customer Focus & Value Delivery', desc: 'Builds intuitive, reliable features that directly elevate end-user productivity.' },
    { name: 'Innovation & Continuous Improvement', desc: 'Pioneers workflow optimizations and integrates modern software patterns.' },
  ];

  for (const c of competencyList) {
    const compId = `COMP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`;
    const comp = await prisma.performance_competencies.upsert({
      where: { id: compId },
      update: {},
      create: {
        id: compId,
        organization_id: 'org_default',
        name: c.name,
        description: c.desc,
        scale: {
          1: 'Novice: Requires constant guidance',
          2: 'Developing: Handles routine tasks with supervision',
          3: 'Proficient: Independently delivers complex features',
          4: 'Advanced: Sets standards and mentors team',
          5: 'Expert: Industry-level subject matter expert',
        },
        is_active: true,
      },
    });

    // Seed sample competency assessment for EMP-001
    await prisma.performance_competency_assessments.create({
      data: {
        id: `COMP-ASSESS-EMP-001-${compId}`,
        competency_id: comp.id,
        employee_id: 'EMP-001',
        assessor_id: 'EMP-002',
        cycle_id: cycleId,
        rating: 4.5,
        comments: 'Exemplary technical craft and proactive problem resolution.',
        assessed_at: new Date(),
      },
    }).catch(() => {});
  }

  // G. Review Assignments (Self & Manager)
  await prisma.performance_review_assignments.upsert({
    where: {
      cycle_id_employee_id_reviewer_id_review_type: {
        cycle_id: cycleId,
        employee_id: 'EMP-001',
        reviewer_id: 'EMP-001',
        review_type: 'Self',
      },
    },
    update: {},
    create: {
      id: `ASGN-SELF-EMP-001`,
      cycle_id: cycleId,
      employee_id: 'EMP-001',
      reviewer_id: 'EMP-001',
      review_type: 'Self',
      status: 'Completed',
      rating: 4.2,
      comments: 'Successfully delivered core payroll and performance engines with high test reliability.',
      self_review_data: {
        accomplishments: 'Delivered Phase 1 & 2 full stack engines and architected Phase 3 talent ecosystem.',
        strengths: 'Full-stack architecture, clean code, rapid prototyping.',
        improvementAreas: 'Deepening distributed systems caching.',
        selfRating: 4.2,
      },
      is_locked: true,
      submitted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  await prisma.performance_review_assignments.upsert({
    where: {
      cycle_id_employee_id_reviewer_id_review_type: {
        cycle_id: cycleId,
        employee_id: 'EMP-001',
        reviewer_id: 'EMP-002',
        review_type: 'Manager',
      },
    },
    update: {},
    create: {
      id: `ASGN-MGR-EMP-001`,
      cycle_id: cycleId,
      employee_id: 'EMP-001',
      reviewer_id: 'EMP-002',
      review_type: 'Manager',
      status: 'Completed',
      rating: 4.6,
      comments: 'Outstanding contributor. Consistently exceeds expectations and demonstrates high ownership.',
      manager_review_data: {
        managerRating: 4.6,
        managerComments: 'Strongest individual deliverer in Q3 sprint series. Ready for Lead title.',
        promotionRecommended: true,
        incrementRecommended: true,
        recommendedIncrementPct: 15,
      },
      calculated_score: 4.55,
      is_locked: true,
      submitted_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // H. Peer Feedback (with Anonymous protection test record)
  await prisma.performance_feedback.createMany({
    data: [
      {
        id: `FB-2026-001`,
        author_id: 'EMP-003',
        recipient_id: 'EMP-001',
        cycle_id: cycleId,
        review_type: 'Peer',
        content: 'Ayush is fantastic to work with. He unblocked the whole team on complex schema migrations.',
        rating: 4.8,
        categories: { collaboration: 5, technical: 5, communication: 4.5 },
        is_anonymous: false,
        created_at: new Date(),
      },
      {
        id: `FB-2026-002`,
        author_id: 'EMP-005',
        recipient_id: 'EMP-001',
        cycle_id: cycleId,
        review_type: 'Peer',
        content: 'Consistently provides high quality PR reviews and comprehensive documentation.',
        rating: 4.5,
        categories: { collaboration: 4.5, technical: 5, communication: 4 },
        is_anonymous: true, // Server-side anonymity test
        created_at: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  // I. Performance Recommendations (Promotion & Increment)
  await prisma.performance_recommendations.upsert({
    where: { id: 'REC-PROMO-EMP-001' },
    update: {},
    create: {
      id: 'REC-PROMO-EMP-001',
      employee_id: 'EMP-001',
      recommender_id: 'EMP-002',
      cycle_id: cycleId,
      type: 'Promotion',
      status: 'Submitted',
      justification: 'Exemplary performance across Phase 1, Phase 2, and Phase 3 development. Ready for Lead AI Engineer role.',
      proposed_value: { recommendedRole: 'Lead AI Engineer', currentRole: 'AI/ML Intern Developer' },
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  // J. Role Skill Benchmarks
  const allSkills = await prisma.skillMaster.findMany();
  const tsSkill = allSkills.find((s) => s.name.includes('TypeScript') || s.category.includes('Tech')) || allSkills[0];
  if (tsSkill) {
    await prisma.role_skill_benchmarks.upsert({
      where: {
        role_title_skill_id: {
          role_title: 'Lead AI Engineer',
          skill_id: tsSkill.id,
        },
      },
      update: {},
      create: {
        id: `RSB-LEAD-${tsSkill.id}`,
        role_title: 'Lead AI Engineer',
        skill_id: tsSkill.id,
        required_proficiency: 'Expert',
        min_proficiency_level: 5,
        priority: 'Critical',
      },
    });
  }

  // K. Career Paths
  await prisma.career_paths.createMany({
    data: [
      {
        id: 'CP-ENG-L1-L2',
        organization_id: 'org_default',
        department: 'Engineering',
        current_role_title: 'Associate Software Engineer',
        next_role_title: 'Software Engineer',
        level_order: 1,
        min_experience_years: 1.5,
        required_skills_summary: 'TypeScript, React, Git, Clean Code Principles, Unit Testing',
        competencies_summary: 'High delivery reliability, active collaboration, continuous learning',
        performance_expectation: 'Consistently completes assigned sprint tasks with zero blocker bugs.',
        is_active: true,
      },
      {
        id: 'CP-ENG-L2-L3',
        organization_id: 'org_default',
        department: 'Engineering',
        current_role_title: 'Software Engineer',
        next_role_title: 'Senior Software Engineer',
        level_order: 2,
        min_experience_years: 3.0,
        required_skills_summary: 'Next.js, Node.js, PostgreSQL/Prisma, API Design, Docker',
        competencies_summary: 'Technical excellence, independent feature ownership, mentoring',
        performance_expectation: 'Independently designs and delivers full-stack features and unblocks peers.',
        is_active: true,
      },
      {
        id: 'CP-ENG-L3-L4',
        organization_id: 'org_default',
        department: 'AI/ML',
        current_role_title: 'AI/ML Intern Developer',
        next_role_title: 'Lead AI Engineer',
        level_order: 3,
        min_experience_years: 2.0,
        required_skills_summary: 'LLM Orchestration, Python/FastAPI, Agent Architecture, Vector DBs, System Design',
        competencies_summary: 'Visionary technical leadership, extreme ownership, cross-team unblocking',
        performance_expectation: 'Delivers full end-to-end modules, authors comprehensive tests, and drives platform stability.',
        is_active: true,
      },
    ],
    skipDuplicates: true,
  });

  // L. Career Aspirations
  await prisma.career_aspirations.upsert({
    where: { employee_id: 'EMP-001' },
    update: {},
    create: {
      id: 'ASP-EMP-001',
      employee_id: 'EMP-001',
      target_role: 'Lead AI Engineer',
      target_department: 'AI/ML',
      target_timeline: '1 Year',
      skills_to_develop: ['Distributed LLM Orchestration', 'Vector Indexing Optimization', 'Engineering Leadership'],
      manager_notes: 'Ayush has demonstrated outstanding capability. On track for promotion nomination in Q3 cycle.',
      last_discussed_at: new Date(),
    },
  });

  // M. Talent Pools & Members (HR Admin Confidential)
  const hiPoPool = await prisma.talent_pools.upsert({
    where: { name: 'High Potential Future Leaders' },
    update: {},
    create: {
      id: 'TP-HIPO-2026',
      organization_id: 'org_default',
      name: 'High Potential Future Leaders',
      category: 'HighPotential',
      description: 'Top 5% talent exhibiting exceptional performance and strategic leadership capacity.',
      is_confidential: true,
      created_by_id: 'EMP-006',
    },
  });

  await prisma.talent_pool_members.upsert({
    where: {
      pool_id_employee_id: {
        pool_id: hiPoPool.id,
        employee_id: 'EMP-001',
      },
    },
    update: {},
    create: {
      id: `TPM-${hiPoPool.id}-EMP-001`,
      pool_id: hiPoPool.id,
      employee_id: 'EMP-001',
      added_by_id: 'EMP-006',
      notes: 'Nominated for exceptional full-stack execution and technical leadership across Phase 1, 2, and 3.',
    },
  });

  // N. Succession Plans (Critical Roles)
  await prisma.succession_plans.upsert({
    where: { id: 'SP-LEAD-ARCH-01' },
    update: {},
    create: {
      id: 'SP-LEAD-ARCH-01',
      organization_id: 'org_default',
      critical_role_title: 'Lead AI Engineer',
      department: 'AI/ML',
      incumbent_employee_id: 'EMP-001',
      emergency_successor_id: 'EMP-002',
      risk_level: 'Low',
      successors_json: JSON.stringify([
        { employeeId: 'EMP-001', readiness: 'READY_NOW', skillGapNotes: 'Ready for promotion immediately', devPlan: 'Transition to principal architecture tracks' },
        { employeeId: 'EMP-005', readiness: 'READY_1_2_YEARS', skillGapNotes: 'Backend proficiency high; AI toolchain training required', devPlan: 'Enrolled in LLM Systems LMS track' },
      ]),
      last_reviewed_at: new Date(),
    },
  });

  // O. Initial 1-to-1 Conversations & Messages
  console.log('Creating initial conversations & messages...');
  const demoConv = await prisma.conversation.upsert({
    where: {
      participant1Id_participant2Id: {
        participant1Id: 'EMP-002',
        participant2Id: 'EMP-003',
      },
    },
    update: {},
    create: {
      id: 'CONV-EMP-002-EMP-003',
      participant1Id: 'EMP-002',
      participant2Id: 'EMP-003',
    },
  });

  const demoMessages = [
    {
      id: 'MSG-DEMO-001',
      conversationId: demoConv.id,
      senderId: 'EMP-003',
      receiverId: 'EMP-002',
      content: "Can we discuss today's task?",
      status: 'SEEN' as const,
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: 'MSG-DEMO-002',
      conversationId: demoConv.id,
      senderId: 'EMP-002',
      receiverId: 'EMP-003',
      content: "Sure, let's discuss.",
      status: 'SEEN' as const,
      createdAt: new Date(Date.now() - 1000 * 60 * 25),
    },
  ];

  for (const msg of demoMessages) {
    await prisma.message.upsert({
      where: { id: msg.id },
      update: msg,
      create: msg,
    });
  }

  console.log('✅ PostgreSQL Database seeding completed successfully with all enterprise modules!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

