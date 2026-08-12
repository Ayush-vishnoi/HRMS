export interface ManagedTeam {
  id: string;
  name: string;
  department: string;
  manager: string;
  leaderId: string;
  memberIds: string[];
  focus: string;
}

export const MOCK_MANAGED_TEAMS: ManagedTeam[] = [
  {
    id: 'TEAM-PLATFORM',
    name: 'Experience Platform',
    department: 'Engineering',
    manager: 'Arjun Mehta',
    leaderId: 'EMP-003',
    memberIds: ['EMP-001', 'EMP-010'],
    focus: 'Design system adoption, accessibility, and employee experience delivery',
  },
  {
    id: 'TEAM-SERVICES',
    name: 'Core Services',
    department: 'Engineering',
    manager: 'Arjun Mehta',
    leaderId: 'EMP-005',
    memberIds: ['EMP-011'],
    focus: 'Reliable payroll, attendance, and people-platform services',
  },
  {
    id: 'TEAM-AI',
    name: 'AI Enablement',
    department: 'AI/ML',
    manager: 'Arjun Mehta',
    leaderId: 'EMP-009',
    memberIds: ['EMP-012'],
    focus: 'Production ML capabilities and responsible workforce insights',
  },
];

export interface TeamMemberMetadata {
  employeeId: string;
  manager: string;
  focus: string;
  workload: number;
  goalProgress: number;
  goalLabel: string;
  nextOneToOne: string;
  risk: 'On track' | 'Needs attention' | 'At risk';
  notes: string;
}

export const MOCK_TEAM_METADATA: TeamMemberMetadata[] = [
  {
    employeeId: 'EMP-001',
    manager: 'Arjun Mehta',
    focus: 'ML model monitoring and HRMS onboarding insights',
    workload: 72,
    goalProgress: 68,
    goalLabel: 'Ship onboarding analytics beta',
    nextOneToOne: '12 Aug 2026',
    risk: 'On track',
    notes: 'Pair with Rahul on the new dashboard data contract.',
  },
  {
    employeeId: 'EMP-003',
    manager: 'Arjun Mehta',
    focus: 'Frontend platform and accessibility improvements',
    workload: 88,
    goalProgress: 82,
    goalLabel: 'Complete design system migration',
    nextOneToOne: '10 Aug 2026',
    risk: 'Needs attention',
    notes: 'Review sprint scope after the current release candidate.',
  },
  {
    employeeId: 'EMP-005',
    manager: 'Arjun Mehta',
    focus: 'Payroll services reliability and API performance',
    workload: 61,
    goalProgress: 74,
    goalLabel: 'Reduce payroll API p95 latency',
    nextOneToOne: '14 Aug 2026',
    risk: 'On track',
    notes: 'Share the incident follow-up with the platform team.',
  },
  {
    employeeId: 'EMP-009',
    manager: 'Arjun Mehta',
    focus: 'AI platform roadmap and responsible model delivery',
    workload: 79,
    goalProgress: 71,
    goalLabel: 'Launch model governance controls',
    nextOneToOne: '13 Aug 2026',
    risk: 'On track',
    notes: 'Align the next model review with Security and People Operations.',
  },
];
