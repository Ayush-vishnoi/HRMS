export type JobStatusType =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Published'
  | 'Open'
  | 'On hold'
  | 'Closed';

export type CandidateStageType =
  | 'New'
  | 'Applied'
  | 'Screening'
  | 'Interview'
  | 'Shortlisted'
  | 'Selected'
  | 'Offer'
  | 'Joined'
  | 'Rejected'
  | 'Withdrawn'
  | 'Archived';

export interface RecruitmentJob {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: 'Full-time' | 'Contract';
  openings: number;
  applicants: number;
  status: JobStatusType;
  postedOn: string;
  createdAt?: string;
  description: string;
  requirements: string[];
  responsibilities?: string[];
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  hiringManagerId?: string | null;
  hiringManagerName?: string | null;
  recruiterId?: string | null;
  recruiterName?: string | null;
  priority?: string;
  targetCloseDate?: string | null;
  approvals?: Array<{
    id: string;
    sequence: number;
    approverId?: string | null;
    approverName: string;
    status: string;
    note?: string | null;
  }>;
}

export interface RecruitmentCandidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  appliedOn: string;
  createdAt?: string;
  stage: CandidateStageType;
  score: number;
  experience: string;
  currentRole: string;
  location: string;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  recommendation: 'Strong match' | 'Review' | 'Low match';
  tags?: string[];
  source?: string;
  assignedRecruiterName?: string | null;
  onboardingEmployeeCode?: string | null;
  onboardingId?: string | null;
  resumeUrl?: string | null;
  resumeStatus?: string;
  ai_match_score?: number | null;
  duplicate_key?: string | null;
  parsedResume?: any;
  matchBreakdown?: {
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    locationScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    experienceGap?: string;
    explanation?: string;
  };
}

export const MOCK_RECRUITMENT_JOBS: RecruitmentJob[] = [
  {
    id: 'JOB-001',
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Bengaluru / Hybrid',
    employmentType: 'Full-time',
    openings: 2,
    applicants: 24,
    status: 'Open',
    postedOn: '01 Aug 2026',
    description: 'Build accessible, high-performance experiences for the MYLOTIC GROUP HR platform.',
    requirements: ['React', 'TypeScript', 'Next.js', 'Testing', 'System design'],
  },
  {
    id: 'JOB-002',
    title: 'AI/ML Engineer',
    department: 'AI/ML',
    location: 'Bengaluru / Remote',
    employmentType: 'Full-time',
    openings: 1,
    applicants: 18,
    status: 'Open',
    postedOn: '28 Jul 2026',
    description: 'Develop practical ML systems that improve people operations and employee insights.',
    requirements: ['Python', 'Machine learning', 'SQL', 'Model deployment', 'Experimentation'],
  },
  {
    id: 'JOB-003',
    title: 'People Operations Specialist',
    department: 'Human Resources',
    location: 'Mumbai / On-site',
    employmentType: 'Full-time',
    openings: 1,
    applicants: 12,
    status: 'On hold',
    postedOn: '20 Jul 2026',
    description: 'Own employee lifecycle operations and deliver a consistent people experience.',
    requirements: ['HR operations', 'Payroll', 'Employee relations', 'Workday', 'Compliance'],
  },
];

export const MOCK_RECRUITMENT_CANDIDATES: RecruitmentCandidate[] = [
  {
    id: 'CAN-001', jobId: 'JOB-001', name: 'Kavya Menon', email: 'kavya.menon@email.com', phone: '+91 98450 12345',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', appliedOn: '06 Aug 2026', stage: 'Screening', score: 92, experience: '6 years', currentRole: 'Senior UI Engineer at Fintech Labs', location: 'Bengaluru, Karnataka', matchedSkills: ['React', 'TypeScript', 'Next.js', 'Testing'], missingSkills: ['System design evidence'], summary: 'Strong product engineering background with measurable accessibility and performance improvements.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-002', jobId: 'JOB-001', name: 'Aditya Kulkarni', email: 'aditya.k@email.com', phone: '+91 98220 22556', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', appliedOn: '05 Aug 2026', stage: 'Interview', score: 84, experience: '5 years', currentRole: 'Frontend Developer at Orbit Systems', location: 'Pune, Maharashtra', matchedSkills: ['React', 'TypeScript', 'Testing'], missingSkills: ['Next.js depth'], summary: 'Solid frontend fundamentals and delivery experience; validate architecture ownership during interview.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-003', jobId: 'JOB-001', name: 'Riya Shah', email: 'riya.shah@email.com', phone: '+91 99090 77889', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&auto=format&fit=crop&q=80', appliedOn: '04 Aug 2026', stage: 'New', score: 71, experience: '4 years', currentRole: 'Software Engineer at CloudNest', location: 'Ahmedabad, Gujarat', matchedSkills: ['React', 'Next.js', 'Testing'], missingSkills: ['TypeScript', 'System design'], summary: 'Promising match with relevant product work, but needs a deeper technical review.', recommendation: 'Review',
  },
  {
    id: 'CAN-004', jobId: 'JOB-002', name: 'Sanjay Rao', email: 'sanjay.rao@email.com', phone: '+91 98800 33445', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', appliedOn: '03 Aug 2026', stage: 'Shortlisted', score: 95, experience: '7 years', currentRole: 'ML Platform Lead at DataForge', location: 'Bengaluru, Karnataka', matchedSkills: ['Python', 'Machine learning', 'SQL', 'Model deployment'], missingSkills: ['None identified'], summary: 'End-to-end ML platform ownership with strong production deployment and experimentation experience.', recommendation: 'Strong match',
  },
  {
    id: 'CAN-005', jobId: 'JOB-002', name: 'Megha Joshi', email: 'megha.joshi@email.com', phone: '+91 98980 44556', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', appliedOn: '01 Aug 2026', stage: 'New', score: 63, experience: '3 years', currentRole: 'Data Scientist at InsightWorks', location: 'Hyderabad, Telangana', matchedSkills: ['Python', 'Machine learning', 'SQL'], missingSkills: ['Model deployment'], summary: 'Good applied ML foundation; assess production readiness and ownership scope.', recommendation: 'Review',
  },
];
