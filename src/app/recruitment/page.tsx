'use client';

import { authFetch, tokenStore } from '@/lib/api-client';
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Filter,
  History,
  Mail,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Tag,
  Upload,
  UserCheck,
  UserPlus,
  X,
  AlertCircle,
  Calendar,
  Video,
  Users,
  Edit3,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Play,
  PhoneCall,
  Award,
  Scale,
  Star,
  ThumbsUp,
  ThumbsDown,
  Download,
  Eye,
  Printer,
  Wallet,
} from 'lucide-react';

import { useHRMS } from '@/shared/providers/HRMSContext';
import type {
  CandidateStageType,
  JobStatusType,
  RecruitmentCandidate,
  RecruitmentJob,
} from '@/features/recruitment/data/recruitment';
import ResumeReviewQueue from '@/features/recruitment/components/ResumeReviewQueue';
import AddCandidateManualModal from '@/features/recruitment/components/AddCandidateManualModal';

const stages = [
  'All',
  'Applied',
  'Screening',
  'Shortlisted',
  'Interview',
  'Selected',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;

type CandidateStageFilter = (typeof stages)[number];

type TimelineItem = {
  id: string;
  type: 'STAGE_CHANGE' | 'NOTE' | 'SYSTEM' | 'ONBOARDING';
  title: string;
  description?: string;
  timestamp: string;
  authorName?: string;
};

type NoteItem = {
  id: string;
  note: string;
  created_at: string;
  employees: {
    name: string;
    roleTitle?: string;
    avatarUrl?: string;
  };
};

/* -----------------------------
   SCORE COLORS
----------------------------- */

const scoreTone = (score: number) => {
  if (score >= 85) {
    return {
      text: 'text-[#17324A]',
      bar: 'bg-[#4F86A8]',
      badge: 'bg-[#B0D0EA]/50 border-[#6FA6C9]',
    };
  }

  if (score >= 70) {
    return {
      text: 'text-[#315B76]',
      bar: 'bg-[#6FA6C9]',
      badge: 'bg-[#B0D0EA]/40 border-[#8DB5CF]',
    };
  }

  return {
    text: 'text-[#A45A5A]',
    bar: 'bg-[#C77B7B]',
    badge: 'bg-[#F3DCDC] border-[#D9A3A3]',
  };
};

/* -----------------------------
   STAGE COLORS
----------------------------- */

const stageTone = (stage: CandidateStageType | string) => {
  switch (stage) {
    case 'Shortlisted':
    case 'Selected':
      return 'bg-[#DDEFE4] text-[#287047] border-[#9CC9AC]';
    case 'Rejected':
    case 'Withdrawn':
      return 'bg-[#F3DCDC] text-[#A45A5A] border-[#D9A3A3]';
    case 'Interview':
      return 'bg-[#DCEAF4] text-[#315B76] border-[#9FC2DC]';
    case 'Offer':
    case 'Joined':
      return 'bg-[#E8F2FA] text-[#17324A] border-[#6FA6C9] font-bold';
    default:
      return 'bg-[#E8F2FA] text-[#315B76] border-[#B0D0EA]';
  }
};

const jobStatusTone = (status: JobStatusType | string) => {
  switch (status) {
    case 'Published':
    case 'Open':
      return 'bg-[#DDEFE4] text-[#287047] border-[#9CC9AC]';
    case 'Pending Approval':
    case 'PendingApproval':
      return 'bg-[#FFF4D8] text-[#8A641B] border-[#E1C58C]';
    case 'Approved':
      return 'bg-[#DCEAF4] text-[#315B76] border-[#9FC2DC]';
    case 'Draft':
      return 'bg-[#F0F4F8] text-[#5D7D94] border-[#C3D9E8]';
    case 'On hold':
    case 'OnHold':
      return 'bg-[#FFF0E6] text-[#A25724] border-[#E8C2A8]';
    case 'Closed':
      return 'bg-[#F3DCDC] text-[#A45A5A] border-[#D9A3A3]';
    default:
      return 'bg-[#E8F2FA] text-[#315B76] border-[#B0D0EA]';
  }
};

const interviewStatusTone = (status: string) => {
  switch (status) {
    case 'Scheduled':
      return 'bg-[#E8F2FA] text-[#315B76] border-[#B0D0EA]';
    case 'Confirmed':
      return 'bg-[#DCEAF4] text-[#17324A] border-[#6FA6C9] font-medium';
    case 'InProgress':
      return 'bg-[#FFF4D8] text-[#8A641B] border-[#E1C58C] font-semibold animate-pulse';
    case 'Completed':
      return 'bg-[#DDEFE4] text-[#287047] border-[#9CC9AC] font-semibold';
    case 'Rescheduled':
      return 'bg-[#FFF0E6] text-[#A25724] border-[#E8C2A8]';
    case 'Cancelled':
    case 'NoShow':
      return 'bg-[#F3DCDC] text-[#A45A5A] border-[#D9A3A3]';
    default:
      return 'bg-[#F0F4F8] text-[#5D7D94] border-[#C3D9E8]';
  }
};

/* -----------------------------
   RECRUITMENT PAGE
----------------------------- */

export default function RecruitmentPage() {
  const { currentUser } = useHRMS();

  const [jobs, setJobs] = useState<RecruitmentJob[]>([]);
  const [allCandidates, setAllCandidates] = useState<RecruitmentCandidate[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<CandidateStageFilter>('All');
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'timeline' | 'interviews'>('overview');

  // Phase 4C-A: Core Interview Engine & Scheduling State
  const [interviews, setInterviews] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [isSubmittingInterview, setIsSubmittingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [panelSearchQuery, setPanelSearchQuery] = useState('');

  const [interviewForm, setInterviewForm] = useState({
    title: '',
    round: 1,
    date: '',
    startTime: '10:00',
    endTime: '11:00',
    type: 'Technical',
    location: '',
    meetingUrl: '',
    panelMembers: [] as string[],
    leadInterviewerId: '',
    reminder: '15m',
  });

  // Candidate CRM Notes & Timeline
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [transitionNote, setTransitionNote] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Phase 4B: Candidate Intelligence & Rediscovery
  const [sortBy, setSortBy] = useState<'matchScore' | 'experience' | 'newest'>('matchScore');
  const [isRediscoveryOpen, setIsRediscoveryOpen] = useState(false);
  const [rediscoveredCandidates, setRediscoveredCandidates] = useState<any[]>([]);
  const [isLoadingRediscovery, setIsLoadingRediscovery] = useState(false);
  const [isProcessingResume, setIsProcessingResume] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddJdOpen, setIsAddJdOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const [jdForm, setJdForm] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'Full-time' as RecruitmentJob['employmentType'],
    openings: '1',
    priority: 'Medium',
    experienceMin: '0',
    experienceMax: '5',
    salaryMin: '',
    salaryMax: '',
    currency: 'INR',
    description: '',
    requirements: '',
    responsibilities: '',
    targetCloseDate: '',
    hiringManagerId: '',
    recruiterId: '',
  });

  // Phase 4C-B: Scorecards, Feedback & Candidate Selection
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackInterview, setFeedbackInterview] = useState<any | null>(null);
  const [feedbackOverallScore, setFeedbackOverallScore] = useState<number>(4);
  const [feedbackRecommendation, setFeedbackRecommendation] = useState<string>('Hire');
  const [feedbackComments, setFeedbackComments] = useState<string>('');
  const [feedbackCriteria, setFeedbackCriteria] = useState<
    Array<{ name: string; score: number; weight: number; remarks: string }>
  >([
    { name: 'Technical Knowledge', score: 4, weight: 40, remarks: '' },
    { name: 'Problem Solving', score: 4, weight: 25, remarks: '' },
    { name: 'Communication', score: 4, weight: 20, remarks: '' },
    { name: 'Role Fit', score: 4, weight: 15, remarks: '' },
  ]);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionDecision, setSelectionDecision] = useState<'SELECT' | 'REJECT' | 'HOLD' | 'NEXT_ROUND'>('SELECT');
  const [selectionReason, setSelectionReason] = useState<string>('');
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Phase 4C-C1: Offer Core & Compensation Snapshot
  const [candidateOffers, setCandidateOffers] = useState<any[]>([]);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [offerIdToEdit, setOfferIdToEdit] = useState<string | null>(null);
  const [offerTitle, setOfferTitle] = useState<string>('');
  const [offerCtc, setOfferCtc] = useState<number>(1200000);
  const [offerCurrency, setOfferCurrency] = useState<string>('INR');
  const [offerJoinDate, setOfferJoinDate] = useState<string>('');
  const [offerExpiresAt, setOfferExpiresAt] = useState<string>('');
  const [offerVariablePay, setOfferVariablePay] = useState<number>(0);
  const [offerJoiningBonus, setOfferJoiningBonus] = useState<number>(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Phase 4C-C2: Single-Level (HR) Offer Approval Workflow
  const [isSubmitApprovalModalOpen, setIsSubmitApprovalModalOpen] = useState(false);
  // Detail-panel collapsible sections (declutter)
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [isOfferDocsCollapsed, setIsOfferDocsCollapsed] = useState(false);
  const [isApproveOfferModalOpen, setIsApproveOfferModalOpen] = useState(false);
  const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false);
  const [isRejectOfferModalOpen, setIsRejectOfferModalOpen] = useState(false);
  const [activeOfferForApproval, setActiveOfferForApproval] = useState<any | null>(null);
  const [approvalActionComment, setApprovalActionComment] = useState<string>('');
  const [isSubmittingApprovalAction, setIsSubmittingApprovalAction] = useState(false);
  const [approvalActionError, setApprovalActionError] = useState<string | null>(null);

  // Phase 4C-C3: Offer Document Generation & Templates
  const [isDocGenModalOpen, setIsDocGenModalOpen] = useState(false);
  const [isDocPreviewModalOpen, setIsDocPreviewModalOpen] = useState(false);
  const [activeOfferForDoc, setActiveOfferForDoc] = useState<any | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>('Offer_Letter');
  const [selectedDocTemplateId, setSelectedDocTemplateId] = useState<string>('');
  const [availableDocTemplates, setAvailableDocTemplates] = useState<any[]>([]);
  const [offerDocumentsList, setOfferDocumentsList] = useState<any[]>([]);
  const [docPreviewHtml, setDocPreviewHtml] = useState<string>('');
  const [docPreviewTitle, setDocPreviewTitle] = useState<string>('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isPreviewingDoc, setIsPreviewingDoc] = useState(false);
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const [docActionError, setDocActionError] = useState<string | null>(null);

  // Live weighted score calculation
  const liveWeightedScore = useMemo(() => {
    let totalWeight = 0;
    let sum = 0;
    for (const c of feedbackCriteria) {
      totalWeight += c.weight;
      sum += c.score * c.weight;
    }
    if (totalWeight === 0) return 0;
    return Math.round((sum / totalWeight) * 100) / 100;
  }, [feedbackCriteria]);

  // Live Offer Compensation Preview
  const liveCompensationPreview = useMemo(() => {
    try {
      const annualCtc = Number(offerCtc) || 0;
      if (annualCtc <= 0) return null;
      const varPay = Number(offerVariablePay) || 0;
      const fixedAnnual = Math.max(0, annualCtc - varPay);
      const monthlyCtc = Math.round(fixedAnnual / 12);
      const basic = Math.round(monthlyCtc * 0.5);
      const hra = Math.round(basic * 0.5);
      const conv = 1600;
      const med = 1250;
      const pfEmp = 1800;
      const gratuity = Math.round((basic * 15) / (26 * 12));
      const subtotal = basic + hra + conv + med + pfEmp + gratuity;
      const special = Math.max(0, monthlyCtc - subtotal);
      const monthlyGross = basic + hra + conv + med + special;
      const pt = monthlyGross > 25000 ? 200 : 0;
      const inHand = Math.max(0, monthlyGross - 1800 - pt);
      return {
        annualCtc,
        monthlyGross,
        basicMonthly: basic,
        hraMonthly: hra,
        specialAllowanceMonthly: special,
        conveyanceMonthly: conv,
        medicalAllowanceMonthly: med,
        pfEmployerMonthly: pfEmp,
        gratuityMonthly: gratuity,
        netTakeHomeMonthly: inHand,
      };
    } catch (e) {
      return null;
    }
  }, [offerCtc, offerVariablePay]);

  /* -----------------------------
     FETCH DATA FROM DATABASE
  ----------------------------- */
  const loadData = async (signal?: AbortSignal) => {
    try {
      const response = await authFetch<Response>('/api/recruitment', { raw: true, cache: 'no-store', signal });
      const payload = await response.json();
      if (payload?.success && payload?.data) {
        const nextJobs: RecruitmentJob[] = (payload.data.jobs || []).map((j: any) => ({
          id: j.id,
          title: j.title,
          department: j.department,
          location: j.location,
          employmentType: j.employmentType === 'Contract' ? 'Contract' : 'Full-time',
          openings: Number(j.openings) || 1,
          applicants: Number(j.applicants) || 0,
          status: j.status === 'PendingApproval' ? 'Pending Approval' : j.status === 'OnHold' ? 'On hold' : j.status,
          createdAt: j.createdAt,
          postedOn: j.postedOn || (j.createdAt ? new Date(j.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
          description: j.description || '',
          requirements: Array.isArray(j.requirements) ? j.requirements : [],
          responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities : [],
          experienceMin: j.experience_min,
          experienceMax: j.experience_max,
          salaryMin: j.salary_min ? Number(j.salary_min) : null,
          salaryMax: j.salary_max ? Number(j.salary_max) : null,
          currency: j.currency || 'INR',
          hiringManagerId: j.hiring_manager_id,
          hiringManagerName: j.hiringManager?.name,
          recruiterId: j.recruiter_id,
          recruiterName: j.recruiter?.name,
          priority: j.priority || 'Medium',
          targetCloseDate: j.target_close_date,
          approvals: (j.recruitment_job_approvals || []).map((a: any) => ({
            id: a.id,
            sequence: a.sequence,
            approverId: a.employees?.id || null,
            approverName: a.employees?.name || 'Reviewer',
            status: a.status,
            note: a.note,
          })),
        }));

        const nextCandidates: RecruitmentCandidate[] = (payload.data.candidates || []).map((c: any) => ({
          id: c.id,
          jobId: c.jobId,
          name: c.name,
          email: c.email,
          phone: c.phone || '',
          avatar:
            c.avatarUrl ||
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          appliedOn: c.appliedOn || (c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
          createdAt: c.createdAt,
          stage: c.stage === 'New' ? 'Applied' : c.stage,
          score: Number(c.score ?? c.ai_match_score) || 0,
          experience: c.experience || '',
          currentRole: c.currentRole || '',
          location: c.location || '',
          matchedSkills: Array.isArray(c.matchedSkills) ? c.matchedSkills : [],
          missingSkills: Array.isArray(c.missingSkills) ? c.missingSkills : [],
          summary: c.summary || '',
          recommendation:
            c.recommendation === 'StrongMatch'
              ? 'Strong match'
              : c.recommendation === 'LowMatch'
                ? 'Low match'
                : 'Review',
          tags: Array.isArray(c.tags) ? c.tags : [],
          source: c.source || 'Manual',
          assignedRecruiterName: c.assignedRecruiter?.name,
          onboardingEmployeeCode: c.onboarding?.employee?.employeeCode ?? null,
          onboardingId: c.onboarding?.id ?? null,
          resumeUrl: c.resumeUrl || (c.resumeDocument ? `/api/recruitment/candidates/${c.id}/resume` : null),
          parsedResume: c.parsed_resume,
          matchBreakdown: c.matches?.[0] || null,
        }));

        setJobs(nextJobs);
        // Joined candidates have converted to employees — they belong to
        // onboarding/employee-lifecycle, not the active recruitment pipeline.
        const activeCandidates = nextCandidates.filter((c) => c.stage !== 'Joined');
        setAllCandidates(activeCandidates);
        setSelectedJobId((current) => current || nextJobs[0]?.id || '');
        setSelectedCandidateId((current) => current || activeCandidates[0]?.id || '');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Failed to load recruitment data:', err);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  // Fetch Notes & Timeline & Interviews whenever selected candidate changes
  const loadInterviews = async (candidateId: string) => {
    if (!candidateId) return;
    setIsLoadingInterviews(true);
    try {
      const res = await authFetch<Response>(`/api/recruitment/interviews?candidateId=${candidateId}`, { raw: true });
      const data = await res.json();
      if (data.success) {
        setInterviews(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load candidate interviews:', err);
    } finally {
      setIsLoadingInterviews(false);
    }
  };

  useEffect(() => {
    // Load employee directory for panel assignment
    authFetch<Response>('/api/employees', { raw: true })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setEmployeesList(json.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCandidateId) return;

    void loadInterviews(selectedCandidateId);
    void loadOffers(selectedCandidateId);

    authFetch<Response>(`/api/recruitment/candidates/${selectedCandidateId}/notes`, { raw: true })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setNotes(data.data || []);
      })
      .catch(() => {});

    authFetch<Response>(`/api/recruitment/candidates/${selectedCandidateId}/timeline`, { raw: true })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setTimeline(data.data || []);
      })
      .catch(() => {});
  }, [selectedCandidateId]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? {
    id: '',
    title: 'No requisition selected',
    department: '',
    location: '',
    employmentType: 'Full-time',
    openings: 0,
    applicants: 0,
    status: 'Draft' as JobStatusType,
    createdAt: '',
    postedOn: '',
    description: '',
    requirements: [],
  };

  const jobCandidates = useMemo(
    () => allCandidates.filter((c) => c.jobId === selectedJob.id),
    [allCandidates, selectedJob.id]
  );

  const filteredCandidates = useMemo(() => {
    const list = jobCandidates.filter((candidate) => {
      const searchText = `${candidate.name} ${candidate.currentRole} ${candidate.location} ${(candidate.tags || []).join(' ')}`;
      const matchesSearch = searchText.toLowerCase().includes(query.toLowerCase());
      // "All" = active pipeline only. Closed stages (Rejected/Withdrawn/Archived)
      // and converted candidates (Joined) stay reachable via their filter pills.
      const matchesStage =
        stageFilter === 'All'
          ? !['Rejected', 'Withdrawn', 'Archived', 'Joined'].includes(candidate.stage)
          : candidate.stage === stageFilter;
      return matchesSearch && matchesStage;
    });

    if (sortBy === 'matchScore') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortBy === 'newest') {
      const appliedEpoch = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
      list.sort((a, b) => appliedEpoch(b.createdAt) - appliedEpoch(a.createdAt));
    } else if (sortBy === 'experience') {
      const parseExp = (e: string) => {
        const m = e.match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : 0;
      };
      list.sort((a, b) => parseExp(b.experience) - parseExp(a.experience));
    }

    return list;
  }, [jobCandidates, query, stageFilter, sortBy]);

  const selectedCandidate =
    jobCandidates.find((c) => c.id === selectedCandidateId) ?? filteredCandidates[0] ?? jobCandidates[0];

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  };

  /* -----------------------------
     RESUME UPLOAD & RE-PARSE HANDLERS
  ----------------------------- */
  const handleUploadResume = async (candidateId: string, file: File) => {
    setIsProcessingResume(true);
    showNotice(`Uploading and parsing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await authFetch<Response>(`/api/recruitment/candidates/${candidateId}/resume`, { raw: true,
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        showNotice(`Resume parsed successfully! Match score: ${json.matchResult?.overallScore || 85}%`);
        await loadData();
      } else {
        showNotice(json.error || json.warning || 'Resume upload failed');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error processing resume');
    } finally {
      setIsProcessingResume(false);
    }
  };

  const handleReparseResume = async (candidateId: string) => {
    setIsProcessingResume(true);
    showNotice('Re-parsing resume and recalculating match intelligence...');

    try {
      const res = await authFetch<Response>(`/api/recruitment/candidates/${candidateId}/parse-resume`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (json.success) {
        showNotice(`Resume re-parsed! New match score: ${json.match?.overallScore || 85}%`);
        await loadData();
      } else {
        showNotice(json.error || 'Failed to re-parse resume');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error re-parsing resume');
    } finally {
      setIsProcessingResume(false);
    }
  };

  /* -----------------------------
     CANDIDATE REDISCOVERY HANDLERS
  ----------------------------- */
  const handleOpenRediscovery = async () => {
    setIsRediscoveryOpen(true);
    setIsLoadingRediscovery(true);
    try {
      const res = await authFetch<Response>(`/api/recruitment/jobs/${selectedJob.id}/rediscover?minScore=40`, { raw: true });
      const json = await res.json();
      if (json.rediscoveredCandidates) {
        setRediscoveredCandidates(json.rediscoveredCandidates);
      }
    } catch (err) {
      console.error('Failed to load rediscovered candidates', err);
    } finally {
      setIsLoadingRediscovery(false);
    }
  };

  const handleAddRediscoveredCandidate = async (candidateId: string) => {
    try {
      const res = await authFetch<Response>(`/api/recruitment/candidates/${candidateId}/add-to-job`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetJobId: selectedJob.id }),
      });

      const json = await res.json();
      if (json.success) {
        showNotice(`Candidate added to "${selectedJob.title}" pipeline!`);
        setIsRediscoveryOpen(false);
        await loadData();
      } else {
        showNotice(json.error || 'Failed to add candidate');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error adding candidate to job');
    }
  };

  /* -----------------------------
     INTERVIEW SCHEDULING HANDLERS (Phase 4C-A)
  ----------------------------- */
  const openScheduleModal = (interviewToEdit?: any) => {
    setInterviewError(null);
    setPanelSearchQuery('');
    if (interviewToEdit) {
      setEditingInterviewId(interviewToEdit.id);
      const startDate = new Date(interviewToEdit.starts_at);
      const endDate = new Date(interviewToEdit.ends_at);
      const dateStr = startDate.toISOString().split('T')[0];
      const startStr = startDate.toTimeString().substring(0, 5);
      const endStr = endDate.toTimeString().substring(0, 5);
      const panelIds = interviewToEdit.interview_panel_members.map((pm: any) => pm.employee_id);
      const leadId =
        interviewToEdit.interview_panel_members.find((pm: any) => pm.is_lead)?.employee_id ||
        panelIds[0] ||
        '';

      setInterviewForm({
        title: interviewToEdit.title,
        round: interviewToEdit.round,
        date: dateStr,
        startTime: startStr,
        endTime: endStr,
        type: interviewToEdit.title.includes('HR')
          ? 'HR'
          : interviewToEdit.title.includes('Managerial')
          ? 'Managerial'
          : 'Technical',
        location: interviewToEdit.location || '',
        meetingUrl: interviewToEdit.meeting_url || '',
        panelMembers: panelIds,
        leadInterviewerId: leadId,
        reminder: '15m',
      });
    } else {
      setEditingInterviewId(null);
      const nextRound =
        interviews.length > 0 ? Math.max(...interviews.map((i: any) => i.round)) + 1 : 1;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];

      const initialPanel = currentUser?.id
        ? [currentUser.id]
        : employeesList.length > 0
        ? [employeesList[0].id]
        : [];
      const initialLead = currentUser?.id || employeesList[0]?.id || '';

      setInterviewForm({
        title: `Round ${nextRound} Technical Interview`,
        round: nextRound,
        date: dateStr,
        startTime: '10:00',
        endTime: '11:00',
        type: 'Technical',
        location: 'Google Meet',
        meetingUrl: 'https://meet.google.com/new',
        panelMembers: initialPanel,
        leadInterviewerId: initialLead,
        reminder: '15m',
      });
    }
    setIsScheduleModalOpen(true);
  };

  const handleSaveInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setIsSubmittingInterview(true);
    setInterviewError(null);

    try {
      const startsAt = new Date(`${interviewForm.date}T${interviewForm.startTime}:00`);
      const endsAt = new Date(`${interviewForm.date}T${interviewForm.endTime}:00`);

      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
        throw new Error('Please specify valid interview date and times.');
      }
      if (startsAt >= endsAt) {
        throw new Error('Interview start time must be before end time.');
      }
      if (interviewForm.panelMembers.length === 0) {
        throw new Error('At least one panel member must be assigned.');
      }
      if (
        !interviewForm.leadInterviewerId ||
        !interviewForm.panelMembers.includes(interviewForm.leadInterviewerId)
      ) {
        throw new Error('A lead interviewer must be designated from the panel.');
      }

      const payload = {
        candidateId: selectedCandidate.id,
        title: interviewForm.title.trim(),
        round: Number(interviewForm.round),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        location: interviewForm.location.trim() || undefined,
        meetingUrl: interviewForm.meetingUrl.trim() || undefined,
        panelMembers: interviewForm.panelMembers,
        leadInterviewerId: interviewForm.leadInterviewerId,
      };

      let res;
      if (editingInterviewId) {
        res = await authFetch<Response>(`/api/recruitment/interviews/${editingInterviewId}`, { raw: true,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch<Response>('/api/recruitment/interviews', { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (json.success) {
        setIsScheduleModalOpen(false);
        showNotice(
          editingInterviewId
            ? 'Interview schedule updated'
            : `Round ${interviewForm.round} Interview scheduled!`
        );
        await loadInterviews(selectedCandidate.id);
        await loadData();

        // Refresh timeline
        const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
        const tlJson = await tlRes.json();
        if (tlJson.success) setTimeline(tlJson.data || []);
      } else {
        setInterviewError(json.error || 'Failed to schedule interview');
      }
    } catch (err: any) {
      setInterviewError(err.message || 'Error scheduling interview');
    } finally {
      setIsSubmittingInterview(false);
    }
  };

  const handleUpdateInterviewStatus = async (interviewId: string, nextStatus: string) => {
    try {
      const res = await authFetch<Response>(`/api/recruitment/interviews/${interviewId}`, { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showNotice(`Interview marked as ${nextStatus}`);
        if (selectedCandidate) {
          await loadInterviews(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        showNotice(json.error || 'Failed to update interview status');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error updating status');
    }
  };

  /* -----------------------------
     PHASE 4C-B: FEEDBACK & SELECTION HANDLERS
  ----------------------------- */
  const openFeedbackModal = (intv: any) => {
    setFeedbackInterview(intv);
    setFeedbackOverallScore(4);
    setFeedbackRecommendation('Hire');
    setFeedbackComments('');
    setFeedbackCriteria([
      { name: 'Technical Knowledge', score: 4, weight: 40, remarks: '' },
      { name: 'Problem Solving', score: 4, weight: 25, remarks: '' },
      { name: 'Communication', score: 4, weight: 20, remarks: '' },
      { name: 'Role Fit', score: 4, weight: 15, remarks: '' },
    ]);
    setFeedbackError(null);
    setIsFeedbackModalOpen(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackInterview) return;
    setIsSubmittingFeedback(true);
    setFeedbackError(null);

    try {
      const payload = {
        overallScore: Number(feedbackOverallScore),
        recommendation: feedbackRecommendation,
        scorecard: {
          criteria: feedbackCriteria.map((c) => ({
            name: c.name,
            score: Number(c.score),
            weight: Number(c.weight),
            remarks: c.remarks.trim() || undefined,
          })),
        },
        comments: feedbackComments.trim() || undefined,
      };

      const res = await authFetch<Response>(`/api/recruitment/interviews/${feedbackInterview.id}/feedback`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showNotice('Interview feedback submitted and locked successfully!');
        setIsFeedbackModalOpen(false);
        if (selectedCandidate) {
          await loadInterviews(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setFeedbackError(json.error || 'Failed to submit feedback');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Error submitting feedback');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const openSelectionModal = (decision: 'SELECT' | 'REJECT' | 'HOLD' | 'NEXT_ROUND') => {
    setSelectionDecision(decision);
    setSelectionReason('');
    setSelectionError(null);
    setIsSelectionModalOpen(true);
  };

  const handleSubmitSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setIsSubmittingSelection(true);
    setSelectionError(null);

    try {
      if (!selectionReason.trim()) {
        throw new Error('Please provide an evaluation justification / notes for this decision.');
      }

      const res = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/selection`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: selectionDecision,
          reason: selectionReason.trim(),
          interviewId: interviews[0]?.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        let msg = `${selectedCandidate.name}: Decision "${selectionDecision}" processed successfully!`;
        if (selectionDecision === 'SELECT') msg = `${selectedCandidate.name} transitioned to Selected!`;
        if (selectionDecision === 'REJECT') msg = `${selectedCandidate.name} transitioned to Rejected.`;
        if (selectionDecision === 'HOLD') msg = `${selectedCandidate.name} placed on hold.`;
        if (selectionDecision === 'NEXT_ROUND') msg = `${selectedCandidate.name} advanced to next interview round!`;

        showNotice(msg);
        setIsSelectionModalOpen(false);
        await loadData();
        if (selectedCandidate) {
          await loadInterviews(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setSelectionError(json.error || 'Failed to process selection decision');
      }
    } catch (err: any) {
      setSelectionError(err.message || 'Error processing selection decision');
    } finally {
      setIsSubmittingSelection(false);
    }
  };

  /* -----------------------------
     PHASE 4C-C1: OFFER HANDLERS
  ----------------------------- */
  const loadOffers = async (candidateId: string) => {
    try {
      const res = await authFetch<Response>(`/api/recruitment/offers?candidateId=${candidateId}`, { raw: true });
      const json = await res.json();
      if (json.success) {
        setCandidateOffers(json.data || []);
      }
    } catch (e) {}
  };

  const openCreateOfferModal = (cand: any) => {
    const job = jobs.find((j) => j.id === cand.jobId);
    setOfferIdToEdit(null);
    setOfferTitle(job?.title || cand.currentRole || 'Software Professional');
    setOfferCtc(1200000);
    setOfferCurrency('INR');
    const future30Days = new Date();
    future30Days.setDate(future30Days.getDate() + 30);
    setOfferJoinDate(future30Days.toISOString().split('T')[0]);
    const future7Days = new Date();
    future7Days.setDate(future7Days.getDate() + 7);
    setOfferExpiresAt(future7Days.toISOString().split('T')[0]);
    setOfferVariablePay(0);
    setOfferJoiningBonus(0);
    setOfferError(null);
    setIsOfferModalOpen(true);
  };

  const openEditOfferModal = (offer: any) => {
    setOfferIdToEdit(offer.id);
    setOfferTitle(offer.offered_title);
    setOfferCtc(Number(offer.offered_ctc));
    setOfferCurrency(offer.currency || 'INR');
    setOfferJoinDate(
      offer.proposed_join_date
        ? new Date(offer.proposed_join_date).toISOString().split('T')[0]
        : ''
    );
    setOfferExpiresAt(
      offer.expires_at ? new Date(offer.expires_at).toISOString().split('T')[0] : ''
    );
    setOfferVariablePay(offer.compensationSnapshot?.variablePayAnnual || 0);
    setOfferJoiningBonus(offer.compensationSnapshot?.joiningBonus || 0);
    setOfferError(null);
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setIsSubmittingOffer(true);
    setOfferError(null);

    try {
      let res;
      if (offerIdToEdit) {
        res = await authFetch<Response>(`/api/recruitment/offers/${offerIdToEdit}`, { raw: true,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            offeredTitle: offerTitle.trim(),
            offeredCtc: Number(offerCtc),
            currency: offerCurrency,
            proposedJoinDate: offerJoinDate || null,
            expiresAt: offerExpiresAt || null,
            variablePayAnnual: Number(offerVariablePay) || 0,
            joiningBonus: Number(offerJoiningBonus) || 0,
          }),
        });
      } else {
        res = await authFetch<Response>('/api/recruitment/offers', { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: selectedCandidate.id,
            offeredTitle: offerTitle.trim(),
            offeredCtc: Number(offerCtc),
            currency: offerCurrency,
            proposedJoinDate: offerJoinDate || null,
            expiresAt: offerExpiresAt || null,
            variablePayAnnual: Number(offerVariablePay) || 0,
            joiningBonus: Number(offerJoiningBonus) || 0,
          }),
        });
      }

      const json = await res.json();
      if (json.success) {
        setIsOfferModalOpen(false);
        showNotice(
          offerIdToEdit
            ? 'Draft offer updated successfully!'
            : `Offer draft created for ${selectedCandidate.name}! Stage updated to Offer.`
        );
        await loadData();
        if (selectedCandidate) {
          await loadOffers(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setOfferError(json.error || 'Failed to save offer');
      }
    } catch (err: any) {
      setOfferError(err.message || 'Error saving offer');
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  /* -----------------------------
     OFFER APPROVAL WORKFLOW ACTIONS (C2)
  ----------------------------- */
  const handleSubmitForApproval = async () => {
    if (!activeOfferForApproval) return;
    setIsSubmittingApprovalAction(true);
    setApprovalActionError(null);

    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${activeOfferForApproval.id}/submit-approval`, { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            note: approvalActionComment.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        setIsSubmitApprovalModalOpen(false);
        setApprovalActionComment('');
        setActiveOfferForApproval(null);
        alert('Offer submitted for HR approval successfully!');
        await loadData();
        if (selectedCandidate) {
          await loadOffers(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setApprovalActionError(json.error || 'Failed to submit offer for approval');
      }
    } catch (err: any) {
      setApprovalActionError(err.message || 'Error submitting offer for approval');
    } finally {
      setIsSubmittingApprovalAction(false);
    }
  };

  const handleApprovalAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES') => {
    if (!activeOfferForApproval) return;
    setIsSubmittingApprovalAction(true);
    setApprovalActionError(null);

    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${activeOfferForApproval.id}/approvals`, { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            comment: approvalActionComment.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        setIsApproveOfferModalOpen(false);
        setIsRequestChangesModalOpen(false);
        setIsRejectOfferModalOpen(false);
        setApprovalActionComment('');
        setActiveOfferForApproval(null);
        alert(
          action === 'APPROVE'
            ? 'Offer approved successfully!'
            : action === 'REQUEST_CHANGES'
            ? 'Changes requested. Offer returned to Draft for recruiter revisions.'
            : 'Offer has been rejected.'
        );
        await loadData();
        if (selectedCandidate) {
          await loadOffers(selectedCandidate.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setApprovalActionError(json.error || `Failed to process ${action}`);
      }
    } catch (err: any) {
      setApprovalActionError(err.message || `Error processing ${action}`);
    } finally {
      setIsSubmittingApprovalAction(false);
    }
  };

  /* -----------------------------
     OFFER DOCUMENT GENERATION & PREVIEW (C3)
  ----------------------------- */
  const openDocGenModal = async (offer: any) => {
    setActiveOfferForDoc(offer);
    setSelectedDocType('Offer_Letter');
    setSelectedDocTemplateId('');
    setDocActionError(null);
    setIsDocGenModalOpen(true);

    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${offer.id}/documents`, { raw: true });
      const json = await res.json();
      if (json.success) {
        setAvailableDocTemplates(json.templates || []);
        setOfferDocumentsList(json.documents || []);
      }
    } catch (e: any) {
      console.error('Failed to load templates/documents', e);
    }
  };

  const handleFetchOfferDocuments = async (offerId: string) => {
    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${offerId}/documents`, { raw: true });
      const json = await res.json();
      if (json.success) {
        setOfferDocumentsList(json.documents || []);
      }
    } catch (e) {
      console.error('Failed to fetch offer documents', e);
    }
  };

  const handlePreviewDocument = async (offerId: string, docType: string, templateId?: string) => {
    setIsPreviewingDoc(true);
    setDocActionError(null);
    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${offerId}/documents/preview`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, templateId: templateId || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setDocPreviewHtml(json.preview.html);
        setDocPreviewTitle(json.preview.documentTitle || 'Document Preview');
        setIsDocPreviewModalOpen(true);
      } else {
        setDocActionError(json.error || 'Failed to generate preview.');
      }
    } catch (e: any) {
      setDocActionError(e.message || 'Error generating preview.');
    } finally {
      setIsPreviewingDoc(false);
    }
  };

  const handleGenerateOfficialDocument = async () => {
    if (!activeOfferForDoc) return;
    setIsGeneratingDoc(true);
    setDocActionError(null);

    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${activeOfferForDoc.id}/documents`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedDocType,
          templateId: selectedDocTemplateId || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        showNotice(
          json.autoSentToCandidate
            ? `${json.document.templateName || json.document.documentType} generated — offer auto-sent to candidate!`
            : `Official ${json.document.templateName || json.document.documentType} generated successfully!`
        );
        setIsDocGenModalOpen(false);
        if (selectedCandidate) {
          await loadOffers(selectedCandidate.id);
          await handleFetchOfferDocuments(activeOfferForDoc.id);
          const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
          const tlJson = await tlRes.json();
          if (tlJson.success) setTimeline(tlJson.data || []);
        }
      } else {
        setDocActionError(json.error || 'Failed to generate document.');
      }
    } catch (e: any) {
      setDocActionError(e.message || 'Error generating document.');
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  /* ---------------------------------------------
     OFFER DISPATCH: SEND / RE-SEND TO CANDIDATE
     (magic-link confirmation email + status 'Sent')
  --------------------------------------------- */
  const handleSendOfferToCandidate = async (offerId: string) => {
    if (!selectedCandidate) return;
    setIsSendingOffer(true);
    setDocActionError(null);

    try {
      const res = await authFetch<Response>(`/api/recruitment/offers/${offerId}/send`, { raw: true,
        method: 'POST',
      });

      const json = await res.json();
      if (json.success) {
        showNotice(json.message || 'Offer sent to candidate.');
        await loadOffers(selectedCandidate.id);
        const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
        const tlJson = await tlRes.json();
        if (tlJson.success) setTimeline(tlJson.data || []);
      } else {
        setDocActionError(json.error || 'Failed to send offer.');
      }
    } catch (e: any) {
      setDocActionError(e.message || 'Error sending offer.');
    } finally {
      setIsSendingOffer(false);
    }
  };

  const handleDownloadDocument = (offerId: string, documentId: string) => {
    const token = encodeURIComponent(tokenStore.get() || '');
    window.open(`/api/recruitment/offers/${offerId}/documents/${documentId}?token=${token}`, '_blank');
  };

  /* -----------------------------
     STAGE TRANSITION ACTION
  ----------------------------- */
  const handleStageTransition = async (nextStage: CandidateStageType) => {
    if (!selectedCandidate) return;
    setIsTransitioning(true);

    try {
      const res = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/stage`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: nextStage,
          note: transitionNote || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (nextStage === 'Joined') {
          // Joined = converted to employee; drop them from the active pipeline.
          setAllCandidates((prev) => prev.filter((c) => c.id !== selectedCandidate.id));
          setSelectedCandidateId('');
        } else {
          setAllCandidates((prev) =>
            prev.map((c) => (c.id === selectedCandidate.id ? { ...c, stage: nextStage } : c))
          );
        }
        showNotice(`${selectedCandidate.name} moved to ${nextStage}`);
        setTransitionNote('');

        // Refresh timeline
        const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
        const tlJson = await tlRes.json();
        if (tlJson.success) setTimeline(tlJson.data || []);
      } else {
        showNotice(json.error || 'Failed to update candidate stage');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error updating stage');
    } finally {
      setIsTransitioning(false);
    }
  };

  /* -----------------------------
     ADD CRM NOTE ACTION
  ----------------------------- */
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate || !newNoteText.trim()) return;
    setIsSubmittingNote(true);

    try {
      const res = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/notes`, { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNoteText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setNotes((prev) => [json.data, ...prev]);
        setNewNoteText('');
        showNotice('Note added to candidate profile');

        // Refresh timeline
        const tlRes = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}/timeline`, { raw: true });
        const tlJson = await tlRes.json();
        if (tlJson.success) setTimeline(tlJson.data || []);
      } else {
        showNotice(json.error || 'Failed to add note');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error adding note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  /* -----------------------------
     ADD TAG TO CANDIDATE
  ----------------------------- */
  const handleAddTag = async () => {
    if (!selectedCandidate || !newTagInput.trim()) return;
    const updatedTags = Array.from(new Set([...(selectedCandidate.tags || []), newTagInput.trim()]));

    try {
      const res = await authFetch<Response>(`/api/recruitment/candidates/${selectedCandidate.id}`, { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      const json = await res.json();
      if (json.success) {
        setAllCandidates((prev) =>
          prev.map((c) => (c.id === selectedCandidate.id ? { ...c, tags: updatedTags } : c))
        );
        setNewTagInput('');
        setIsAddingTag(false);
        showNotice(`Tag added`);
      }
    } catch (err) {}
  };

  /* -----------------------------
     JOB APPROVAL & PUBLISH ACTIONS
  ----------------------------- */
  const handleJobAction = async (jobId: string, action: string, note?: string) => {
    try {
      let res;
      if (action === 'submit_approval') {
        res = await authFetch<Response>(`/api/recruitment/jobs/${jobId}`, { raw: true,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'submit_approval', note }),
        });
      } else if (['APPROVE', 'REJECT', 'REQUEST_CHANGES'].includes(action)) {
        res = await authFetch<Response>(`/api/recruitment/jobs/${jobId}/approvals`, { raw: true,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, note }),
        });
      } else if (action === 'publish') {
        res = await authFetch<Response>(`/api/recruitment/jobs/${jobId}`, { raw: true,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'publish' }),
        });
      } else if (action === 'hold' || action === 'close') {
        res = await authFetch<Response>(`/api/recruitment/jobs/${jobId}`, { raw: true,
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
      }

      if (res) {
        const json = await res.json();
        if (json.success) {
          showNotice(`Job requisition updated: ${action}`);
          await loadData();
        } else {
          showNotice(json.error || 'Action failed');
        }
      }
    } catch (err: any) {
      showNotice(err.message || 'Error processing action');
    }
  };

  /* -----------------------------
     CREATE JOB ACTION
  ----------------------------- */
  const addJobDescription = async (event: React.FormEvent<HTMLFormElement>, submitForApproval = false) => {
    event.preventDefault();

    const requirementsArr = jdForm.requirements
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    const responsibilitiesArr = jdForm.responsibilities
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      const res = await authFetch<Response>('/api/recruitment/jobs', { raw: true,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jdForm.title.trim(),
          department: jdForm.department.trim(),
          location: jdForm.location.trim(),
          employmentType: jdForm.employmentType,
          openings: Math.max(1, Number(jdForm.openings) || 1),
          priority: jdForm.priority,
          experienceMin: Number(jdForm.experienceMin) || 0,
          experienceMax: jdForm.experienceMax ? Number(jdForm.experienceMax) : null,
          salaryMin: jdForm.salaryMin ? Number(jdForm.salaryMin) : null,
          salaryMax: jdForm.salaryMax ? Number(jdForm.salaryMax) : null,
          currency: jdForm.currency,
          description: jdForm.description.trim(),
          requirements: requirementsArr,
          responsibilities: responsibilitiesArr,
          targetCloseDate: jdForm.targetCloseDate || null,
          hiringManagerId: jdForm.hiringManagerId || null,
          recruiterId: jdForm.recruiterId || null,
          status: currentUser.userRole === 'admin' && !submitForApproval ? 'Open' : 'Draft',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const createdJobId = json.data.id;
        if (submitForApproval) {
          // Create as Draft first, then run the submit_approval action so the
          // backend builds the L1 (hiring manager) → L2 (admin) approval chain.
          const submitRes = await authFetch<Response>(`/api/recruitment/jobs/${createdJobId}`, { raw: true,
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submit_approval' }),
          });
          const submitJson = await submitRes.json();
          if (!submitJson.success) {
            showNotice(submitJson.error || 'Job created, but failed to submit for approval');
            await loadData();
            setSelectedJobId(createdJobId);
            return;
          }
        }
        showNotice(`${jdForm.title} requisition created`);
        await loadData();
        setSelectedJobId(createdJobId);
        setIsAddJdOpen(false);
      } else {
        showNotice(json.error || 'Failed to create job');
      }
    } catch (err: any) {
      showNotice(err.message || 'Error creating job');
    }
  };

  /* -----------------------------
     ACCESS CONTROL
  ----------------------------- */

  if (currentUser.userRole !== 'admin' && currentUser.userRole !== 'manager') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-xl border border-[#9FC2DC] bg-white p-8 text-center shadow-sm max-w-md">
          <h2 className="text-lg font-bold text-[#17324A]">Recruitment Workspace</h2>
          <p className="mt-2 text-sm text-[#315B76]">
            This workspace is reserved for HR Administrators and authorized Hiring Managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden text-[#17324A]">
      {/* =========================
          HEADER
      ========================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#315B76]">
            Recruitment Intelligence · Core ATS
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#17324A]">
            Enterprise ATS & Candidate Pipeline
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-xs font-semibold text-[#17324A] shadow-sm transition-colors hover:bg-[#E8F2FA]"
          >
            <Upload className="h-4 w-4 text-[#315B76]" />
            Upload resumes
          </button>

          <button
            type="button"
            onClick={() => setIsAddCandidateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-xs font-semibold text-[#17324A] shadow-sm transition-colors hover:bg-[#E8F2FA]"
          >
            <UserPlus className="h-4 w-4 text-[#315B76]" />
            Add Candidate Manually
          </button>

          <button
            type="button"
            onClick={() => setIsAddJdOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#17324A] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#315B76]"
          >
            <Plus className="h-4 w-4" />
            Add Requisition
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-[#9FC2DC] bg-[#E8F2FA] px-4 py-2.5 text-xs font-medium text-[#17324A] shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-[#287047]" />
          <span>{notice}</span>
        </div>
      )}

      {/* =========================
          MAIN 3-COLUMN WORKSPACE
      ========================= */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 2xl:grid-cols-4">
        {/* =========================
            COLUMN 1: REQUISITIONS
        ========================= */}
        <section className="space-y-4 rounded-xl border border-[#9FC2DC] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#315B76]">
              Job Requisitions ({jobs.length})
            </h2>
            <span className="text-[11px] text-[#5D7D94]">
              {currentUser.userRole === 'admin' ? 'All Requisitions' : 'Assigned to You'}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {jobs.map((job) => {
              const isSelected = job.id === selectedJob.id;
              return (
                <div
                  key={job.id}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setSelectedCandidateId('');
                  }}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-[#17324A] bg-[#F4F9FC] shadow-sm ring-1 ring-[#17324A]'
                      : 'border-[#C3D9E8] bg-white hover:border-[#8DB5CF] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-[#17324A] line-clamp-1">{job.title}</h3>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${jobStatusTone(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <p className="mt-1 text-[11px] text-[#5D7D94]">
                    {job.department} · {job.location}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#315B76]">
                    <span>
                      {job.openings} {job.openings === 1 ? 'opening' : 'openings'}
                    </span>
                    <span>
                      {allCandidates.filter((c) => c.jobId === job.id).length} candidates
                    </span>
                  </div>
                </div>
              );
            })}

            {jobs.length === 0 && (
              <p className="py-8 text-center text-xs text-[#5D7D94]">No active requisitions found.</p>
            )}
          </div>
        </section>

        {/* =========================
            COLUMN 2: CANDIDATE PIPELINE
        ========================= */}
        <section className="space-y-4 rounded-xl border border-[#9FC2DC] bg-white p-4 shadow-sm xl:col-span-1">
          {/* Header & Selected Job Summary */}
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#315B76]">
                Pipeline: {selectedJob.title}
              </h2>
              <span className="text-[11px] font-bold text-[#17324A]">
                {filteredCandidates.length} of {jobCandidates.length}
              </span>
            </div>

            {/* Job Actions Banner if Draft or Pending */}
            {selectedJob.status === 'Draft' && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#C3D9E8] bg-[#F0F4F8] p-2 text-xs">
                <span className="text-[#5D7D94]">Requisition is in Draft</span>
                <button
                  type="button"
                  onClick={() => handleJobAction(selectedJob.id, 'submit_approval')}
                  className="rounded bg-[#17324A] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                >
                  Submit for Approval
                </button>
              </div>
            )}

            {selectedJob.status === 'Pending Approval' &&
              (() => {
                const chain = [...(selectedJob.approvals || [])].sort((a, b) => a.sequence - b.sequence);
                const myPendingStep = chain.find(
                  (a) => a.approverId === currentUser?.id && a.status === 'Pending',
                );
                return (
                  <div className="mt-3 rounded-lg border border-[#E1C58C] bg-[#FFF4D8] p-2.5 text-xs text-[#8A641B]">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Pending Approval Review</span>
                      {myPendingStep ? (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleJobAction(selectedJob.id, 'APPROVE')}
                            className="rounded bg-[#287047] px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-[#1E5736]"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleJobAction(selectedJob.id, 'REJECT', 'Revisions requested')}
                            className="rounded border border-[#D9A3A3] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#A45A5A]"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-medium">
                          {chain.some((a) => a.status === 'Pending')
                            ? 'Awaiting other approvers'
                            : 'Finalizing'}
                        </span>
                      )}
                    </div>
                    {chain.length > 0 && (
                      <div className="mt-1.5 space-y-0.5 text-[10px] font-normal">
                        {chain.map((a) => (
                          <p key={a.id}>
                            {a.status === 'Approved' ? '✓' : a.status === 'Pending' ? '⏳' : '✕'} L
                            {a.sequence} {a.approverName}
                            {a.approverId === currentUser?.id ? ' (you)' : ''} —{' '}
                            {a.status === 'Pending' ? 'awaiting action' : a.status.toLowerCase()}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            {selectedJob.status === 'Approved' && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-[#9CC9AC] bg-[#DDEFE4] p-2 text-xs text-[#287047]">
                <span className="font-semibold">Approved Requisition</span>
                <button
                  type="button"
                  onClick={() => handleJobAction(selectedJob.id, 'publish')}
                  className="rounded bg-[#17324A] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                >
                  Publish Now
                </button>
              </div>
            )}
          </div>

          {/* Search, Sort, & Rediscovery Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#5D7D94]" />
                <input
                  type="text"
                  placeholder="Search candidates, skills, tags..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] bg-white pl-8 pr-3 py-1.5 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9]"
                />
              </div>

              <button
                type="button"
                onClick={handleOpenRediscovery}
                className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-[#9FC2DC] bg-[#E8F2FA] px-2.5 py-1.5 text-[11px] font-semibold text-[#17324A] transition-colors hover:bg-[#D4E6F5]"
                title="Find matching candidates from historical requisitions"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#315B76]" />
                Rediscover
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* Stage filter pills */}
              <div className="flex flex-wrap gap-1">
                {stages.map((stg) => (
                  <button
                    key={stg}
                    type="button"
                    onClick={() => setStageFilter(stg)}
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      stageFilter === stg
                        ? 'border-[#17324A] bg-[#17324A] text-white'
                        : 'border-[#C3D9E8] bg-[#F4F9FC] text-[#315B76] hover:bg-[#E8F2FA]'
                    }`}
                  >
                    {stg}
                  </button>
                ))}
              </div>

              {/* Sort By selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="shrink-0 rounded border border-[#C3D9E8] bg-white px-2 py-0.5 text-[10px] font-medium text-[#17324A] outline-none"
              >
                <option value="matchScore">Sort: Match %</option>
                <option value="experience">Sort: Exp</option>
                <option value="newest">Sort: Newest</option>
              </select>
            </div>
          </div>

          {/* Candidate List */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredCandidates.map((candidate) => {
              const isSelected = candidate.id === selectedCandidate?.id;
              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelectedCandidateId(candidate.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-[#17324A] bg-[#F4F9FC] shadow-sm ring-1 ring-[#17324A]'
                      : 'border-[#C3D9E8] bg-white hover:border-[#8DB5CF] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={candidate.avatar}
                        alt={candidate.name}
                        width={32}
                        height={32}
                        unoptimized
                        className="h-8 w-8 rounded-full border border-[#9FC2DC] object-cover"
                      />
                      <div>
                        <h3 className="text-xs font-bold text-[#17324A]">{candidate.name}</h3>
                        <p className="text-[10px] text-[#5D7D94] line-clamp-1">{candidate.currentRole}</p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${stageTone(
                        candidate.stage
                      )}`}
                    >
                      {candidate.stage}
                    </span>
                  </div>

                  {/* Tags */}
                  {candidate.tags && candidate.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {candidate.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-[#E8F2FA] px-1.5 py-0.5 text-[9px] font-medium text-[#315B76]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#5D7D94]">
                    <span>Score: {candidate.score}%</span>
                    <span>Applied: {candidate.appliedOn}</span>
                  </div>
                </div>
              );
            })}

            {filteredCandidates.length === 0 && (
              <p className="py-8 text-center text-xs text-[#5D7D94]">No candidates match filters.</p>
            )}
          </div>
        </section>

        {/* =========================
            COLUMN 3: CANDIDATE PROFILE & CRM
        ========================= */}
        {selectedCandidate ? (
          <section className="min-w-0 overflow-hidden rounded-xl border border-[#9FC2DC] bg-white p-4 shadow-sm xl:col-span-1 2xl:col-span-2">
            {/* Top Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#C3D9E8] pb-4">
              <div className="flex items-center gap-3">
                <Image
                  src={selectedCandidate.avatar}
                  alt={selectedCandidate.name}
                  width={48}
                  height={48}
                  unoptimized
                  className="h-12 w-12 rounded-full border border-[#9FC2DC] object-cover"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#17324A]">{selectedCandidate.name}</h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${stageTone(
                        selectedCandidate.stage
                      )}`}
                    >
                      {selectedCandidate.stage}
                    </span>
                  </div>
                  <p className="text-xs text-[#315B76]">{selectedCandidate.currentRole}</p>
                  <p className="text-[10px] text-[#5D7D94]">
                    {selectedCandidate.email} · {selectedCandidate.phone}
                  </p>
                </div>
              </div>

              {/* Tags display + Add tag */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(selectedCandidate.tags || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full border border-[#9FC2DC] bg-[#E8F2FA] px-2 py-0.5 text-[10px] font-medium text-[#17324A]"
                  >
                    <Tag className="h-2.5 w-2.5 text-[#315B76]" />
                    {t}
                  </span>
                ))}
                {isAddingTag ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Tag name"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      className="rounded border border-[#C3D9E8] px-2 py-0.5 text-[10px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="rounded bg-[#17324A] px-1.5 py-0.5 text-[10px] text-white"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(false)}
                      className="text-[10px] text-[#5D7D94]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="rounded-full border border-dashed border-[#6FA6C9] px-2 py-0.5 text-[10px] text-[#315B76] hover:bg-[#E8F2FA]"
                  >
                    + Tag
                  </button>
                )}
              </div>
            </div>

            {/* Stage Transition Bar — separated with divider + consistent spacing */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#C3D9E8] bg-[#F4F9FC] p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#17324A]">
                <span>Move candidate:</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {selectedCandidate.stage !== 'Screening' && selectedCandidate.stage === 'Applied' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => handleStageTransition('Screening')}
                    className="rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                  >
                    Screening
                  </button>
                )}

                {selectedCandidate.stage === 'Screening' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => handleStageTransition('Shortlisted')}
                    className="rounded bg-[#287047] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#1E5736]"
                  >
                    Shortlist
                  </button>
                )}

                {selectedCandidate.stage === 'Shortlisted' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => handleStageTransition('Interview')}
                    className="rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                  >
                    Move to Interview
                  </button>
                )}

                {selectedCandidate.stage === 'Interview' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => handleStageTransition('Selected')}
                    className="rounded bg-[#287047] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#1E5736]"
                  >
                    Select Candidate
                  </button>
                )}

                {selectedCandidate.stage === 'Selected' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => openCreateOfferModal(selectedCandidate)}
                    className="rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76] shadow-xs flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Create Formal Offer
                  </button>
                )}

                {selectedCandidate.stage !== 'Rejected' && selectedCandidate.stage !== 'Joined' && (
                  <button
                    type="button"
                    disabled={isTransitioning}
                    onClick={() => handleStageTransition('Rejected')}
                    className="rounded border border-[#D9A3A3] bg-[#F3DCDC] px-2 py-1 text-[10px] font-semibold text-[#A45A5A] hover:bg-[#EFD0D0]"
                  >
                    Reject
                  </button>
                )}

                {/* Direct 1-Click Onboarding Bridge */}
                {selectedCandidate.onboardingEmployeeCode || selectedCandidate.onboardingId ? (
                  <span className="rounded bg-[#DDEFE4] px-2 py-1 text-[10px] font-bold text-[#287047]">
                    Onboarded{selectedCandidate.onboardingEmployeeCode ? ` · ${selectedCandidate.onboardingEmployeeCode}` : ''}
                  </span>
                ) : (
                  ['Sent', 'Viewed', 'Accepted'].includes(candidateOffers[0]?.status) &&
                  (selectedCandidate.stage === 'Shortlisted' ||
                    selectedCandidate.stage === 'Selected' ||
                    selectedCandidate.stage === 'Offer') && (
                    <Link
                      href={{
                        pathname: '/employee-lifecycle',
                        query: { candidateId: selectedCandidate.id },
                      }}
                      className="inline-flex items-center gap-1 rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-[#315B76]"
                    >
                      <UserPlus className="h-3 w-3" />
                      Start Onboarding
                    </Link>
                  )
                )}
              </div>
            </div>

            {/* Phase 4C-C1: Offer Card if candidate has offers or is in Offer stage */}
            {candidateOffers.length > 0 && (() => {
              const latestOffer = candidateOffers[0];
              let declineReason: string | null = latestOffer.compensationSnapshot?.declineReason || null;
              if (!declineReason && latestOffer.content_snapshot) {
                try {
                  const parsedSnap = JSON.parse(latestOffer.content_snapshot);
                  declineReason = parsedSnap?.declineReason || null;
                } catch (e) {}
              }
              return (
                <div className="mt-5 rounded-lg border border-[#9FC2DC] bg-[#F8FAFC] p-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#17324A] px-2 py-0.5 text-[10px] font-bold text-white">
                        Offer v{latestOffer.version}
                      </span>
                      <span className="text-xs font-bold text-[#17324A]">
                        {latestOffer.offered_title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                          latestOffer.status === 'Draft'
                            ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                            : latestOffer.status === 'Approved' || latestOffer.status === 'Accepted'
                            ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
                            : latestOffer.status === 'Sent' || latestOffer.status === 'Viewed'
                            ? 'bg-[#E8F2FA] text-[#17324A] border-[#9FC2DC]'
                            : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]'
                        }`}
                      >
                        {latestOffer.status}
                      </span>
                      {latestOffer.status === 'Draft' && (
                        <button
                          type="button"
                          onClick={() => openEditOfferModal(latestOffer)}
                          className="rounded border border-[#9FC2DC] bg-[#E8F2FA] px-2 py-0.5 text-[10px] font-semibold text-[#17324A] hover:bg-[#D4E5F5]"
                        >
                          Edit Draft
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Offer Summary Card (FIX 2: grouped stats with header) */}
                  <div className="mt-3 rounded-lg border border-[#C3D9E8] bg-white p-3">
                    <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2">
                      <Wallet className="h-3.5 w-3.5 text-[#17324A]" />
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#17324A]">
                        Offer Summary
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block">Annual CTC</span>
                        <span className="font-bold text-[#0F172A] text-xs">
                          ₹{Number(latestOffer.offered_ctc || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="rounded bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block">Est. Monthly In-Hand</span>
                        <span className="font-bold text-[#166534] text-xs">
                          ₹{Number(latestOffer.compensationSnapshot?.estimatedNetTakeHomeMonthly || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="rounded bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block">Proposed Joining</span>
                        <span className="font-semibold text-[#0F172A] text-xs">
                          {latestOffer.proposed_join_date
                            ? new Date(latestOffer.proposed_join_date).toLocaleDateString()
                            : 'TBD'}
                        </span>
                      </div>
                      <div className="rounded bg-[#F8FAFC] p-2 border border-[#E2E8F0]">
                        <span className="text-[10px] text-[#64748B] block">Offer Expiry</span>
                        <span className="font-semibold text-[#0F172A] text-xs">
                          {latestOffer.expires_at
                            ? new Date(latestOffer.expires_at).toLocaleDateString()
                            : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Phase 4C-C2: Single-Level HR Approval Status & Actions */}
                  {latestOffer.status === 'Draft' && (
                    <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-2.5">
                      <span className="text-[11px] text-[#64748B]">
                        Ready for review? Submit to HR for approval.
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveOfferForApproval(latestOffer);
                          setApprovalActionComment('');
                          setApprovalActionError(null);
                          setIsSubmitApprovalModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded bg-[#17324A] px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-[#315B76]"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Submit for Approval
                      </button>
                    </div>
                  )}

                  {latestOffer.status === 'PendingApproval' && (
                    <div className="mt-3 border-t border-[#E2E8F0] pt-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#17324A] flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#D97706]" />
                          Pending HR Approval
                        </span>
                      </div>

                      {/* Approval Chain Status Display (L1 manager + L2 admin) */}
                      <div
                        className={`rounded p-2.5 border text-[11px] ${
                          (latestOffer.approvalSummary?.completedLevels || 0) >=
                            (latestOffer.approvalSummary?.totalLevels || 1) &&
                          (latestOffer.approvalSummary?.totalLevels || 0) > 0
                            ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#166534]'
                            : 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]'
                        }`}
                      >
                        <span className="font-bold block">HR / Admin Review</span>
                        {latestOffer.approvalSummary?.totalLevels ? (
                          <span>
                            {(latestOffer.approvalSummary?.completedLevels || 0) >=
                            latestOffer.approvalSummary.totalLevels
                              ? '✓ Approved by all levels'
                              : `⏳ Approved ${latestOffer.approvalSummary.completedLevels} of ${latestOffer.approvalSummary.totalLevels} levels`}
                          </span>
                        ) : (
                          <span>⏳ Pending Action</span>
                        )}
                      </div>
                      {(latestOffer.recruitment_offer_approvals?.length || 0) > 0 && (
                        <div className="space-y-1">
                          {latestOffer.recruitment_offer_approvals
                            .slice()
                            .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
                            .map((step: any) => (
                              <div
                                key={step.id}
                                className="flex items-center justify-between rounded border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-[10px]"
                              >
                                <span className="text-[#17324A] font-semibold">
                                  L{step.sequence || '-'} · {step.employees?.name || 'Approver'}
                                </span>
                                <span
                                  className={
                                    step.status === 'Approved'
                                      ? 'text-[#166534] font-semibold'
                                      : step.status === 'Pending'
                                        ? 'text-[#92400E] font-semibold'
                                        : 'text-[#9F1239] font-semibold'
                                  }
                                >
                                  {step.status === 'Approved'
                                    ? '✓ Approved'
                                    : step.status === 'Pending'
                                      ? '⏳ Pending'
                                      : `✕ ${step.status}`}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Approver Action Triggers */}
                      <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-2">
                        <span className="text-[10px] text-[#64748B]">
                          {latestOffer.approvalSummary?.canCurrentUserApprove
                            ? 'You are authorized to review this offer:'
                            : 'Waiting for HR approver response.'}
                        </span>
                        {latestOffer.approvalSummary?.canCurrentUserApprove && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveOfferForApproval(latestOffer);
                                setApprovalActionComment('');
                                setApprovalActionError(null);
                                setIsRejectOfferModalOpen(true);
                              }}
                              className="rounded border border-[#FECDD3] bg-[#FFE4E6] px-2 py-1 text-[11px] font-semibold text-[#9F1239] hover:bg-[#FDA4AF]"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveOfferForApproval(latestOffer);
                                setApprovalActionComment('');
                                setApprovalActionError(null);
                                setIsRequestChangesModalOpen(true);
                              }}
                              className="rounded border border-[#FED7AA] bg-[#FFEDD5] px-2 py-1 text-[11px] font-semibold text-[#9A3412] hover:bg-[#FDBA74]"
                            >
                              Request Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveOfferForApproval(latestOffer);
                                setApprovalActionComment('');
                                setApprovalActionError(null);
                                setIsApproveOfferModalOpen(true);
                              }}
                              className="rounded bg-[#166534] px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#14532D]"
                            >
                              Approve
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {latestOffer.status === 'Approved' && (() => {
                    let approvedDocs: any[] = [];
                    try {
                      const parsed = latestOffer.content_snapshot ? JSON.parse(latestOffer.content_snapshot) : null;
                      if (Array.isArray(parsed?.documents)) approvedDocs = parsed.documents;
                    } catch (e) {}
                    return (
                      <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-2 text-xs">
                        <span className="text-[11px] font-bold text-[#166534] flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#166534]" />
                          {approvedDocs.length > 0
                            ? 'Approved by HR. Ready to send to the candidate.'
                            : 'Approved by HR. Generate the first document to auto-send it to the candidate.'}
                        </span>
                        {approvedDocs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendOfferToCandidate(latestOffer.id)}
                            disabled={isSendingOffer}
                            className="inline-flex items-center gap-1 rounded bg-[#23587E] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-[#1B4461] disabled:opacity-60"
                          >
                            <Mail className="h-3 w-3" />
                            {isSendingOffer ? 'Sending…' : 'Send to Candidate'}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {(latestOffer.status === 'Sent' || latestOffer.status === 'Viewed') && (
                    <div className="mt-3 border-t border-[#E2E8F0] pt-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-bold text-[#23587E] flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-[#23587E]" />
                          Sent to candidate — awaiting e-signature & acceptance.
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSendOfferToCandidate(latestOffer.id)}
                          disabled={isSendingOffer}
                          className="inline-flex items-center gap-1 rounded bg-[#23587E] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-[#1B4461] disabled:opacity-60"
                        >
                          <Mail className="h-3 w-3" />
                          {isSendingOffer ? 'Sending…' : 'Resend Email'}
                        </button>
                      </div>
                      {latestOffer.sent_at && (
                        <p className="text-[10px] text-[#64748B]">
                          Last sent: {new Date(latestOffer.sent_at).toLocaleString('en-GB')}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-2 rounded border border-[#9FC2DC] bg-[#E8F2FA] px-2.5 py-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#17324A]">
                          <CheckCircle2 className="h-3 w-3 text-[#287047]" />
                          Offer dispatched — proceed to onboarding once the candidate joins.
                        </span>
                        {!selectedCandidate.onboardingId && (
                          <Link
                            href={{ pathname: '/employee-lifecycle', query: { candidateId: selectedCandidate.id } }}
                            className="inline-flex shrink-0 items-center gap-1 rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-[#315B76]"
                          >
                            <UserPlus className="h-3 w-3" />
                            Start Onboarding
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {latestOffer.status === 'Declined' && (
                    <div className="mt-3 border-t border-[#E2E8F0] pt-2 text-xs">
                      <span className="text-[11px] font-bold text-[#9F1239] flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-[#9F1239]" />
                        Offer was declined/rejected during review — read-only.
                      </span>
                      {declineReason && (
                        <p className="mt-1 pl-5 text-[11px] italic text-[#9F1239]">
                          Candidate's reason: "{declineReason}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Document Generation & PDF Section (C3) */}
                  {(() => {
                    let docs: any[] = [];
                    try {
                      const parsed = latestOffer.content_snapshot ? JSON.parse(latestOffer.content_snapshot) : null;
                      if (Array.isArray(parsed?.documents)) docs = parsed.documents;
                    } catch (e) {}

                    return (
                      <div className="mt-3 border-t border-[#E2E8F0] pt-2.5 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setIsOfferDocsCollapsed(!isOfferDocsCollapsed)}
                            className="flex items-center gap-1.5 text-left"
                            aria-expanded={!isOfferDocsCollapsed}
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-200 ${isOfferDocsCollapsed ? '-rotate-90' : ''}`}
                            />
                            <FileText className="h-3.5 w-3.5 text-[#17324A]" />
                            <span className="font-bold text-[#17324A]">Generated Documents ({docs.length})</span>
                          </button>
                          <div className="flex items-center gap-1.5">
                            {['Approved', 'Sent'].includes(latestOffer.status) ? (
                              <button
                                type="button"
                                onClick={() => openDocGenModal(latestOffer)}
                                className="inline-flex items-center gap-1 rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-[#315B76]"
                              >
                                <Plus className="h-3 w-3" />
                                Generate Document
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePreviewDocument(latestOffer.id, 'Offer_Letter')}
                                className="inline-flex items-center gap-1 rounded border border-[#C3D9E8] bg-white px-2 py-1 text-[10px] font-semibold text-[#17324A] hover:bg-[#F4F9FC]"
                              >
                                <Eye className="h-3 w-3" />
                                Preview Draft
                              </button>
                            )}
                          </div>
                        </div>

                        {!isOfferDocsCollapsed && (docs.length > 0 ? (
                          <div className="space-y-1.5 pt-1 max-h-[300px] overflow-y-auto pr-1">
                            {docs.map((doc: any) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between rounded-lg border border-[#C3D9E8] bg-white p-2 text-xs"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[#17324A]">{doc.templateName || doc.documentType}</span>
                                    <span className="rounded bg-[#E8F2FA] px-1.5 py-0.2 text-[9px] font-bold text-[#17324A]">
                                      v{doc.offerVersion}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#64748B]">
                                    Generated {new Date(doc.generatedAt).toLocaleDateString('en-GB')} by {doc.generatedByName} · {(doc.fileSize / 1024).toFixed(1)} KB
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewDocument(latestOffer.id, doc.documentType, doc.templateId)}
                                    className="rounded border border-[#9FC2DC] bg-[#F4F9FC] px-2 py-1 text-[10px] font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
                                  >
                                    Preview
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadDocument(latestOffer.id, doc.id)}
                                    className="inline-flex items-center gap-1 rounded bg-[#17324A] px-2 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                                  >
                                    <Download className="h-3 w-3" />
                                    Download PDF
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[#64748B] italic">
                            {['Approved', 'Sent'].includes(latestOffer.status)
                              ? 'No documents generated yet. Click "Generate Document" to create formal Offer/Appointment/NDA letters.'
                              : 'Official document generation is unlocked once the offer is fully Approved.'}
                          </p>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

            {/* Upcoming Interview Indicator */}
            {(() => {
              const activeStatuses = ['Scheduled', 'Confirmed', 'InProgress', 'Rescheduled'];
              const upcomingInterview = interviews.find((i: any) => activeStatuses.includes(i.status));
              if (!upcomingInterview) return null;

              return (
                <div className="mt-5 flex items-center justify-between rounded-lg border border-[#9FC2DC] bg-[#E8F2FA] p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-[#17324A] p-1.5 text-white">
                      <Calendar className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[#17324A]">
                          Upcoming: Round {upcomingInterview.round} ({upcomingInterview.title})
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] border ${interviewStatusTone(
                            upcomingInterview.status
                          )}`}
                        >
                          {upcomingInterview.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#5D7D94]">
                        {new Date(upcomingInterview.starts_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })} ·{' '}
                        {new Date(upcomingInterview.starts_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })} -{' '}
                        {new Date(upcomingInterview.ends_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {upcomingInterview.meeting_url && (
                    <a
                      href={upcomingInterview.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white shadow-xs hover:bg-[#315B76]"
                    >
                      <Video className="h-3 w-3" />
                      Join Interview
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Profile Tabs */}
            <div className="mt-4 flex border-b border-[#C3D9E8] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-2 pr-4 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-[#17324A] text-[#17324A]'
                    : 'text-[#5D7D94] hover:text-[#17324A]'
                }`}
              >
                Profile & Match
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('interviews')}
                className={`pb-2 px-4 transition-colors ${
                  activeTab === 'interviews'
                    ? 'border-b-2 border-[#17324A] text-[#17324A]'
                    : 'text-[#5D7D94] hover:text-[#17324A]'
                }`}
              >
                Interviews ({interviews.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`pb-2 px-4 transition-colors ${
                  activeTab === 'notes'
                    ? 'border-b-2 border-[#17324A] text-[#17324A]'
                    : 'text-[#5D7D94] hover:text-[#17324A]'
                }`}
              >
                Recruiter Notes ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 px-4 transition-colors ${
                  activeTab === 'timeline'
                    ? 'border-b-2 border-[#17324A] text-[#17324A]'
                    : 'text-[#5D7D94] hover:text-[#17324A]'
                }`}
              >
                Activity Timeline ({timeline.length})
              </button>
            </div>

            {/* TAB CONTENT 1: OVERVIEW & INTELLIGENCE */}
            {activeTab === 'overview' && (
              <div className="mt-4 space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {/* Resume Upload & Status Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-[#E8F2FA] p-2 text-[#17324A]">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#17324A]">Candidate Resume</p>
                      <p className="text-[10px] text-[#5D7D94]">
                        {selectedCandidate.resumeUrl ? 'Document processed & parsed' : 'No resume uploaded yet (PDF, DOCX, TXT)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCandidate.resumeUrl ? (
                      <>
                        <a
                          href={`${selectedCandidate.resumeUrl}?token=${encodeURIComponent(tokenStore.get() || '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-[#9FC2DC] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#17324A] hover:bg-[#F4F9FC]"
                        >
                          View Document
                        </a>
                        <button
                          type="button"
                          onClick={() => handleReparseResume(selectedCandidate.id)}
                          className="rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]"
                        >
                          Re-parse
                        </button>
                      </>
                    ) : (
                      <label className="cursor-pointer rounded bg-[#17324A] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#315B76]">
                        Upload & Parse
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadResume(selectedCandidate.id, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Explainable Match Score & Breakdown Card */}
                <div className="rounded-xl border border-[#9FC2DC] bg-[#E8F2FA]/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                        Explainable Fit Score
                      </span>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className={`text-3xl font-extrabold ${scoreTone(selectedCandidate.score).text}`}>
                          {selectedCandidate.score}%
                        </span>
                        <span className="text-xs font-semibold text-[#315B76]">
                          {selectedCandidate.score >= 80 ? 'Strong Match' : selectedCandidate.score >= 60 ? 'Moderate Fit' : 'Low Match'}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#9FC2DC] bg-white p-3 text-[#17324A] shadow-sm">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Narrative explanation */}
                  {selectedCandidate.matchBreakdown?.explanation && (
                    <p className="mt-2.5 text-xs text-[#17324A] leading-relaxed border-t border-[#C3D9E8]/60 pt-2">
                      {selectedCandidate.matchBreakdown.explanation}
                    </p>
                  )}

                  {/* Granular Breakdown Bars */}
                  <div className="mt-3.5 space-y-2 border-t border-[#C3D9E8]/60 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#315B76]">
                      Weighted Scoring Breakdown
                    </div>
                    
                    {/* Skills (50%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#17324A]">Technical Skills (50% weight)</span>
                        <span className="font-semibold text-[#17324A]">
                          {selectedCandidate.matchBreakdown?.skillScore ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#C3D9E8]">
                        <div
                          className="h-full rounded-full bg-[#17324A]"
                          style={{ width: `${selectedCandidate.matchBreakdown?.skillScore ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Experience (30%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#17324A]">Experience & Seniority (30% weight)</span>
                        <span className="font-semibold text-[#17324A]">
                          {selectedCandidate.matchBreakdown?.experienceScore ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#C3D9E8]">
                        <div
                          className="h-full rounded-full bg-[#4F86A8]"
                          style={{ width: `${selectedCandidate.matchBreakdown?.experienceScore ?? 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Location & Role Fit (20%) */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-[#17324A]">Location & Education Fit (20% weight)</span>
                        <span className="font-semibold text-[#17324A]">
                          {selectedCandidate.matchBreakdown?.locationScore ?? 0}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#C3D9E8]">
                        <div
                          className="h-full rounded-full bg-[#6FA6C9]"
                          style={{ width: `${selectedCandidate.matchBreakdown?.locationScore ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Summary */}
                <div>
                  <h3 className="text-xs font-bold text-[#17324A]">Executive Summary</h3>
                  <p className="mt-1 text-xs leading-5 text-[#315B76]">{selectedCandidate.summary}</p>
                </div>

                {/* Experience & Location */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-[#C3D9E8] bg-[#F4F9FC] p-2.5">
                    <p className="text-[10px] uppercase text-[#6F91A8]">Total Experience</p>
                    <p className="mt-0.5 font-semibold text-[#17324A]">{selectedCandidate.experience}</p>
                  </div>
                  <div className="rounded-lg border border-[#C3D9E8] bg-[#F4F9FC] p-2.5">
                    <p className="text-[10px] uppercase text-[#6F91A8]">Current Location</p>
                    <p className="mt-0.5 font-semibold text-[#17324A]">{selectedCandidate.location}</p>
                  </div>
                </div>

                {/* Matched Skills */}
                <div>
                  <h3 className="text-xs font-bold text-[#17324A]">Matched Competencies</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedCandidate.matchedSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[#9CC9AC] bg-[#DDEFE4] px-2.5 py-0.5 text-[10px] font-medium text-[#287047]"
                      >
                        <CheckCircle2 className="mr-1 inline h-2.5 w-2.5" />
                        {skill}
                      </span>
                    ))}
                    {selectedCandidate.matchedSkills.length === 0 && (
                      <span className="text-[11px] text-[#5D7D94]">No matched skills flagged.</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills / Gaps */}
                <div>
                  <h3 className="text-xs font-bold text-[#17324A]">Gaps to Validate in Interview</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedCandidate.missingSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-[#E1C58C] bg-[#FFF4D8] px-2.5 py-0.5 text-[10px] font-medium text-[#8A641B]"
                      >
                        {skill}
                      </span>
                    ))}
                    {selectedCandidate.missingSkills.length === 0 && (
                      <span className="text-[11px] text-[#287047]">✓ Covers all primary job prerequisites.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: RECRUITER NOTES (CRM) */}
            {activeTab === 'notes' && (
              <div className="mt-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setIsNotesCollapsed(!isNotesCollapsed)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] px-3 py-2 text-left"
                  aria-expanded={!isNotesCollapsed}
                >
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#17324A]" />
                    <span className="text-xs font-bold text-[#17324A]">Recruiter Notes ({notes.length})</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-200 ${isNotesCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isNotesCollapsed && (
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea
                      rows={2}
                      required
                      placeholder="Add recruiter or interview feedback note..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full rounded-lg border border-[#C3D9E8] p-2.5 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingNote}
                        className="rounded-lg bg-[#17324A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#315B76]"
                      >
                        {isSubmittingNote ? 'Saving...' : 'Add Note'}
                      </button>
                    </div>
                  </form>
                )}

                {!isNotesCollapsed && (
                  <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-[#5D7D94]">
                        <span className="font-bold text-[#17324A]">{n.employees?.name || 'Recruiter'}</span>
                        <span>{new Date(n.created_at).toLocaleDateString('en-GB')}</span>
                      </div>
                      <p className="mt-1 text-xs text-[#315B76]">{n.note}</p>
                    </div>
                  ))}

                  {notes.length === 0 && (
                    <p className="py-6 text-center text-xs text-[#5D7D94]">No recruiter notes yet.</p>
                  )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: ACTIVITY TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] px-3 py-2 text-left"
                  aria-expanded={!isTimelineCollapsed}
                >
                  <span className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5 text-[#17324A]" />
                    <span className="text-xs font-bold text-[#17324A]">Activity Timeline ({timeline.length})</span>
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[#64748B] transition-transform duration-200 ${isTimelineCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>

                {!isTimelineCollapsed && (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {timeline.map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-start gap-3 text-xs">
                    <div className="mt-0.5 rounded-full border border-[#9FC2DC] bg-[#E8F2FA] p-1 text-[#315B76]">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="flex-1 rounded-lg border border-[#E2E8F0] bg-white p-2.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#17324A]">{evt.title}</span>
                        <span className="text-[10px] text-[#64748B]">
                          {new Date(evt.timestamp).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {evt.description && <p className="mt-1 text-xs text-[#334155]">{evt.description}</p>}
                      <p className="mt-1 text-[10px] text-[#64748B]">By: {evt.authorName || 'System'}</p>
                    </div>
                  </div>
                ))}

                    {timeline.length === 0 && (
                      <p className="py-6 text-center text-xs text-[#5D7D94]">No timeline activity recorded.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: INTERVIEWS (PHASE 4C-A) */}
            {activeTab === 'interviews' && (
              <div className="mt-4 space-y-4 max-h-[550px] overflow-y-auto pr-1">
                {/* Header with Schedule Button */}
                <div className="flex items-center justify-between rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#17324A]">Interview Rounds & Schedules</h3>
                    <p className="text-[10px] text-[#5D7D94]">
                      Manage multi-round interview pipelines, panel assignments, and calendar conflict detection.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openScheduleModal()}
                    disabled={
                      selectedCandidate.stage !== 'Shortlisted' && selectedCandidate.stage !== 'Interview'
                    }
                    title={
                      selectedCandidate.stage !== 'Shortlisted' && selectedCandidate.stage !== 'Interview'
                        ? 'Candidate must be Shortlisted or in Interview stage to schedule.'
                        : 'Schedule new interview round'
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#17324A] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#315B76] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Schedule Round
                  </button>
                </div>

                {/* CANDIDATE SELECTION DECISION (PHASE 4C-B) */}
                {selectedCandidate.stage === 'Interview' && (
                  <div className="rounded-xl border border-[#9CC9AC] bg-[#F4FAF6] p-3.5 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E5736]">
                        <Award className="h-4 w-4 text-[#287047]" />
                        Candidate Selection Decision
                      </div>
                      <span className="text-[10px] font-semibold text-[#5D7D94]">
                        Stage: <span className="text-[#287047] font-bold">Interview</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-[#42614E]">
                      Review panel feedback and evaluations below to execute the candidate selection decision.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => openSelectionModal('SELECT')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#287047] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1E5736]"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Select Candidate
                      </button>
                      <button
                        type="button"
                        onClick={() => openSelectionModal('NEXT_ROUND')}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#17324A] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#315B76]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Move to Next Round
                      </button>
                      <button
                        type="button"
                        onClick={() => openSelectionModal('HOLD')}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E1C58C] bg-[#FFF4D8] px-3 py-1.5 text-xs font-semibold text-[#8A641B] hover:bg-[#FCEAC0]"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Place on Hold
                      </button>
                      <button
                        type="button"
                        onClick={() => openSelectionModal('REJECT')}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] px-3 py-1.5 text-xs font-semibold text-[#A45A5A] hover:bg-[#EFD0D0]"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        Reject Candidate
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Interview Progression Timeline */}
                {interviews.length > 0 && (
                  <div className="rounded-lg border border-[#C3D9E8] bg-white p-3 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94] mb-2">
                      Interview Progression Flow
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {interviews
                        .slice()
                        .sort((a, b) => a.round - b.round)
                        .map((intv, idx, arr) => (
                          <React.Fragment key={intv.id}>
                            <div className="flex items-center gap-1.5 rounded-md border border-[#C3D9E8] bg-[#F8FAFC] px-2.5 py-1 text-xs">
                              <span className="font-bold text-[#17324A]">R{intv.round}:</span>
                              <span className="truncate max-w-[100px] text-[#315B76]">{intv.title}</span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[9px] border ${interviewStatusTone(
                                  intv.status
                                )}`}
                              >
                                {intv.status}
                              </span>
                            </div>
                            {idx < arr.length - 1 && (
                              <span className="text-[#9FC2DC] font-bold">→</span>
                            )}
                          </React.Fragment>
                        ))}
                    </div>
                  </div>
                )}

                {/* Interviews List */}
                <div className="space-y-3">
                  {interviews.map((intv: any) => {
                    const leadMember = intv.interview_panel_members.find((pm: any) => pm.is_lead);
                    const isCompleted = intv.status === 'Completed';
                    const isCancelled = intv.status === 'Cancelled';
                    const isTerminal = isCompleted || isCancelled;
                    const feedbackList: any[] = intv.interview_feedback || [];
                    const panelMembersList: any[] = intv.interview_panel_members || [];

                    // Calculate metrics
                    const totalScore = feedbackList.reduce((acc, fb) => acc + fb.overall_score, 0);
                    const avgScore =
                      feedbackList.length > 0
                        ? Math.round((totalScore / feedbackList.length) * 100) / 100
                        : 0;

                    const posCount = feedbackList.filter(
                      (fb) => fb.recommendation === 'StrongHire' || fb.recommendation === 'Hire'
                    ).length;
                    const negCount = feedbackList.filter(
                      (fb) => fb.recommendation === 'NoHire' || fb.recommendation === 'StrongNoHire'
                    ).length;
                    const hasDisagreement = posCount > 0 && negCount > 0;

                    return (
                      <div
                        key={intv.id}
                        className="rounded-xl border border-[#C3D9E8] bg-white p-4 shadow-2xs space-y-3 hover:border-[#8DB5CF] transition-all"
                      >
                        {/* Header: Title, Round & Status */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-[#17324A] px-2 py-0.5 text-[10px] font-bold text-white">
                                Round {intv.round}
                              </span>
                              <h4 className="text-xs font-bold text-[#17324A]">{intv.title}</h4>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[#5D7D94]">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-[#315B76]" />
                                {new Date(intv.starts_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-[#315B76]" />
                                {new Date(intv.starts_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}{' '}
                                -{' '}
                                {new Date(intv.ends_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {intv.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-[#315B76]" />
                                  {intv.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] border ${interviewStatusTone(
                                intv.status
                              )}`}
                            >
                              {intv.status}
                            </span>
                          </div>
                        </div>

                        {/* Panel Members */}
                        <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-xs">
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#5D7D94] mb-1.5">
                            <Users className="h-3 w-3 text-[#315B76]" />
                            Interview Panel ({panelMembersList.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {panelMembersList.map((pm: any) => (
                              <div
                                key={pm.id}
                                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs ${
                                  pm.is_lead
                                    ? 'border border-[#6FA6C9] bg-[#E8F2FA] text-[#17324A] font-semibold'
                                    : 'border border-[#CBD5E1] bg-white text-[#334155]'
                                }`}
                              >
                                <span>{pm.employees?.name || pm.employee_id}</span>
                                {pm.is_lead && (
                                  <span className="rounded bg-[#17324A] px-1.5 py-0.2 text-[8px] font-bold text-white uppercase">
                                    Lead
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* COMPLETED INTERVIEW: SCORECARD & FEEDBACK (PHASE 4C-B) */}
                        {isCompleted && (
                          <div className="rounded-lg border border-[#B0D0EA] bg-[#F4F9FC] p-3 text-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-bold text-[#17324A]">
                                <Scale className="h-3.5 w-3.5 text-[#315B76]" />
                                Interview Feedback & Evaluation ({feedbackList.length}/{panelMembersList.length} Submitted)
                              </div>
                              <button
                                type="button"
                                onClick={() => openFeedbackModal(intv)}
                                className="inline-flex items-center gap-1 rounded bg-[#17324A] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#315B76]"
                              >
                                <Star className="h-3 w-3" />
                                Submit Feedback
                              </button>
                            </div>

                            {/* Consolidated Evaluation Summary */}
                            {feedbackList.length > 0 && (
                              <div className="rounded-md border border-[#C3D9E8] bg-white p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <span className="text-[10px] text-[#5D7D94] uppercase">Average Score</span>
                                      <div className="text-sm font-bold text-[#17324A]">
                                        ⭐ {avgScore.toFixed(2)} <span className="text-[10px] font-normal text-[#5D7D94]">/ 5</span>
                                      </div>
                                    </div>
                                    <div className="h-6 w-px bg-[#E2E8F0]" />
                                    <div>
                                      <span className="text-[10px] text-[#5D7D94] uppercase">Consensus</span>
                                      <div className="text-xs font-bold text-[#287047]">
                                        {hasDisagreement ? (
                                          <span className="text-[#8A641B]">Mixed</span>
                                        ) : posCount > negCount ? (
                                          'Hire'
                                        ) : (
                                          'No Hire'
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {hasDisagreement && (
                                    <div className="inline-flex items-center gap-1 rounded bg-[#FFF4D8] px-2 py-0.5 text-[10px] font-semibold text-[#8A641B] border border-[#E1C58C]">
                                      <AlertTriangle className="h-3 w-3" />
                                      Panel Disagreement Detected
                                    </div>
                                  )}
                                </div>

                                {/* Reviewer Feedback Entries */}
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                                    Panel Member Submissions
                                  </div>
                                  {feedbackList.map((fb: any) => (
                                    <div
                                      key={fb.id}
                                      className="flex items-start justify-between rounded border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-xs"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-[#17324A]">
                                            {fb.employees?.name || 'Panel Member'}
                                          </span>
                                          <span
                                            className={`rounded px-1.5 py-0.2 text-[9px] font-semibold ${
                                              fb.recommendation.includes('Hire') && !fb.recommendation.includes('No')
                                                ? 'bg-[#DDEFE4] text-[#287047]'
                                                : 'bg-[#F3DCDC] text-[#A45A5A]'
                                            }`}
                                          >
                                            {fb.recommendation}
                                          </span>
                                          <span className="font-bold text-[#315B76]">
                                            {fb.overall_score}/5
                                          </span>
                                        </div>
                                        {fb.comments && (
                                          <p className="mt-1 text-[11px] text-[#475569] italic">
                                            &ldquo;{fb.comments}&rdquo;
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-[#94A3B8]">
                                        {new Date(fb.submitted_at).toLocaleDateString('en-GB', {
                                          day: '2-digit',
                                          month: 'short',
                                        })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Meeting Link & Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E2E8F0] pt-2 text-xs">
                          <div className="flex items-center gap-2">
                            {intv.meeting_url && (
                              <a
                                href={intv.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded border border-[#6FA6C9] bg-[#E8F2FA] px-2.5 py-1 text-[10px] font-semibold text-[#17324A] hover:bg-[#DCEAF4]"
                              >
                                <Video className="h-3 w-3" />
                                Join Meeting
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}
                          </div>

                          {!isTerminal && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {intv.status === 'Scheduled' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterviewStatus(intv.id, 'Confirmed')}
                                  className="rounded border border-[#9CC9AC] bg-[#DDEFE4] px-2 py-1 text-[10px] font-semibold text-[#287047] hover:bg-[#CBE5D4]"
                                >
                                  Confirm
                                </button>
                              )}
                              {(intv.status === 'Scheduled' || intv.status === 'Confirmed') && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterviewStatus(intv.id, 'InProgress')}
                                  className="rounded border border-[#E1C58C] bg-[#FFF4D8] px-2 py-1 text-[10px] font-semibold text-[#8A641B] hover:bg-[#FCEAC0]"
                                >
                                  Start
                                </button>
                              )}
                              {intv.status === 'InProgress' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterviewStatus(intv.id, 'Completed')}
                                  className="rounded bg-[#287047] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#1E5736]"
                                >
                                  Mark Completed
                                </button>
                              )}
                              {(intv.status === 'Scheduled' || intv.status === 'Confirmed') && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInterviewStatus(intv.id, 'NoShow')}
                                  className="rounded border border-[#D9A3A3] bg-[#F3DCDC] px-2 py-1 text-[10px] font-semibold text-[#A45A5A] hover:bg-[#EFD0D0]"
                                >
                                  No Show
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => openScheduleModal(intv)}
                                className="rounded border border-[#9FC2DC] bg-[#F4F9FC] px-2 py-1 text-[10px] font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
                              >
                                Reschedule
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateInterviewStatus(intv.id, 'Cancelled')}
                                className="rounded border border-[#D9A3A3] bg-white px-2 py-1 text-[10px] font-semibold text-[#A45A5A] hover:bg-[#F3DCDC]"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {interviews.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#5D7D94] border border-dashed border-[#C3D9E8] rounded-xl bg-[#F8FAFC]">
                      <Calendar className="mx-auto h-6 w-6 text-[#9FC2DC] mb-1.5" />
                      <p className="font-semibold text-[#17324A]">No interviews scheduled yet</p>
                      <p className="mt-1 text-[11px] text-[#5D7D94]">
                        {selectedCandidate.stage === 'Shortlisted' || selectedCandidate.stage === 'Interview'
                          ? 'Click "Schedule Round" above to create Round 1 with panel members and conflict checking.'
                          : 'Shortlist the candidate to unlock interview scheduling.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-xl border border-[#9FC2DC] bg-white p-8 text-center text-xs text-[#5D7D94] xl:col-span-1 2xl:col-span-2">
            Select a candidate from the pipeline to inspect profile and CRM notes.
          </section>
        )}
      </div>

      {/* =========================
          ADD REQUISITION MODAL
      ========================= */}
      {isAddJdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/30 p-4 backdrop-blur-sm">
          <form
            onSubmit={(e) => addJobDescription(e, false)}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#17324A]">Create Job Requisition</h2>
                <p className="mt-1 text-xs text-[#5D7D94]">
                  Define job requirements, experience, compensation brackets, and hiring parameters.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddJdOpen(false)}
                className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Job Title *
                <input
                  required
                  value={jdForm.title}
                  onChange={(e) => setJdForm({ ...jdForm, title: e.target.value })}
                  placeholder="e.g. Lead Backend Engineer"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Department *
                <input
                  required
                  value={jdForm.department}
                  onChange={(e) => setJdForm({ ...jdForm, department: e.target.value })}
                  placeholder="e.g. Engineering"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Location *
                <input
                  required
                  value={jdForm.location}
                  onChange={(e) => setJdForm({ ...jdForm, location: e.target.value })}
                  placeholder="e.g. Bengaluru / Hybrid"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Employment Type
                <select
                  value={jdForm.employmentType}
                  onChange={(e) => setJdForm({ ...jdForm, employmentType: e.target.value as any })}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                >
                  <option>Full-time</option>
                  <option>Contract</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Openings *
                <input
                  required
                  min="1"
                  type="number"
                  value={jdForm.openings}
                  onChange={(e) => setJdForm({ ...jdForm, openings: e.target.value })}
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Priority
                <select
                  value={jdForm.priority}
                  onChange={(e) => setJdForm({ ...jdForm, priority: e.target.value })}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Hiring Manager (L1 Approver)
                <select
                  value={jdForm.hiringManagerId}
                  onChange={(e) => setJdForm({ ...jdForm, hiringManagerId: e.target.value })}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                >
                  <option value="">Auto-assign (fallback approver)</option>
                  {[...employeesList]
                    .filter((emp) => emp.status !== 'Inactive' && emp.status !== 'Terminated')
                    .sort((a, b) => (a.userRole === 'manager' ? 0 : 1) - (b.userRole === 'manager' ? 0 : 1))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                        {emp.roleTitle ? ` — ${emp.roleTitle}` : ''}
                        {emp.userRole === 'manager' ? ' (Manager)' : ''}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Recruiter
                <select
                  value={jdForm.recruiterId}
                  onChange={(e) => setJdForm({ ...jdForm, recruiterId: e.target.value })}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                >
                  <option value="">Unassigned</option>
                  {employeesList
                    .filter((emp) => emp.status !== 'Inactive' && emp.status !== 'Terminated')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                        {emp.roleTitle ? ` — ${emp.roleTitle}` : ''}
                      </option>
                    ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Experience Range (Years)
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Min"
                    value={jdForm.experienceMin}
                    onChange={(e) => setJdForm({ ...jdForm, experienceMin: e.target.value })}
                    className="w-1/2 rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Max"
                    value={jdForm.experienceMax}
                    onChange={(e) => setJdForm({ ...jdForm, experienceMax: e.target.value })}
                    className="w-1/2 rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Salary Range (Annual ₹)
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min CTC"
                    value={jdForm.salaryMin}
                    onChange={(e) => setJdForm({ ...jdForm, salaryMin: e.target.value })}
                    className="w-1/2 rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Max CTC"
                    value={jdForm.salaryMax}
                    onChange={(e) => setJdForm({ ...jdForm, salaryMax: e.target.value })}
                    className="w-1/2 rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
              Job Description *
              <textarea
                required
                rows={3}
                value={jdForm.description}
                onChange={(e) => setJdForm({ ...jdForm, description: e.target.value })}
                placeholder="Describe role scope and key outcomes..."
                className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
              Required Skills <span className="font-normal text-[#6F91A8]">(Comma-separated)</span>
              <input
                required
                value={jdForm.requirements}
                onChange={(e) => setJdForm({ ...jdForm, requirements: e.target.value })}
                placeholder="Node.js, PostgreSQL, Distributed Systems"
                className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
              />
            </label>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsAddJdOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => addJobDescription(e as any, true)}
                className="rounded-lg border border-[#17324A] bg-white px-3.5 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#F4F9FC]"
              >
                Submit for Approval
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#315B76]"
              >
                Save Requisition
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================
          RESUME UPLOAD MODAL
      ========================= */}
      {isUploadOpen && (
        <ResumeReviewQueue
          jobs={jobs}
          defaultJobId={selectedJobId}
          onClose={() => setIsUploadOpen(false)}
          onCandidateCreated={(message) => {
            showNotice(message);
            void loadData();
          }}
        />
      )}

      {isAddCandidateOpen && (
        <AddCandidateManualModal
          jobs={jobs}
          defaultJobId={selectedJobId}
          onClose={() => setIsAddCandidateOpen(false)}
          onCreated={(message) => {
            showNotice(message);
            void loadData();
          }}
        />
      )}

      {/* =========================
          CANDIDATE REDISCOVERY MODAL
      ========================= */}
      {isRediscoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-[#C3D9E8] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#315B76]" />
                  <h2 className="text-sm font-bold text-[#17324A]">Candidate Rediscovery Engine</h2>
                </div>
                <p className="mt-1 text-xs text-[#5D7D94]">
                  Match past applicants and talent pool candidates against requisition <strong className="text-[#17324A]">{selectedJob.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRediscoveryOpen(false)}
                className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoadingRediscovery ? (
              <div className="py-12 text-center text-xs text-[#5D7D94]">
                Searching historical candidate database and calculating explainable fit scores...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#5D7D94]">
                  <span>Found {rediscoveredCandidates.length} high-potential candidates</span>
                  <span>Minimum Match Threshold: 40%</span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {rediscoveredCandidates.map((cand) => (
                    <div
                      key={cand.candidateId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3.5 hover:border-[#8DB5CF] transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-[#17324A]">{cand.name}</h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${scoreTone(cand.matchScore).badge}`}>
                            {cand.matchScore}% Match
                          </span>
                          <span className="rounded bg-[#E8F2FA] px-1.5 py-0.5 text-[9px] font-medium text-[#315B76]">
                            From: {cand.previousJobTitle} ({cand.previousStage})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5D7D94]">
                          {cand.currentRole} · {cand.experience} · {cand.location}
                        </p>
                        {cand.matchBreakdown?.explanation && (
                          <p className="text-[10px] text-[#315B76] italic">
                            {cand.matchBreakdown.explanation}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(cand.tags || []).slice(0, 4).map((t: string) => (
                            <span key={t} className="rounded bg-white border border-[#C3D9E8] px-1.5 py-0.2 text-[9px] text-[#17324A]">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddRediscoveredCandidate(cand.candidateId)}
                        className="shrink-0 rounded-lg bg-[#17324A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#315B76] transition-colors"
                      >
                        + Add to This Job
                      </button>
                    </div>
                  ))}

                  {rediscoveredCandidates.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#5D7D94]">
                      No past candidates matched the technical criteria for this requisition.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-[#C3D9E8] pt-3">
              <button
                type="button"
                onClick={() => setIsRediscoveryOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          SCHEDULE / RESCHEDULE INTERVIEW MODAL (Phase 4C-A)
      ========================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveInterview}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-[#C3D9E8] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#17324A]">
                  {editingInterviewId ? 'Reschedule / Edit Interview' : 'Schedule Candidate Interview'}
                </h2>
                <p className="mt-1 text-xs text-[#5D7D94]">
                  Target: <strong className="text-[#17324A]">{selectedCandidate?.name}</strong> for{' '}
                  <strong className="text-[#17324A]">{selectedJob?.title}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Error Banner */}
            {interviewError && (
              <div className="rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] p-3 text-xs text-[#A45A5A] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{interviewError}</span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Interview Round *
                <input
                  required
                  type="number"
                  min="1"
                  value={interviewForm.round}
                  onChange={(e) => setInterviewForm({ ...interviewForm, round: parseInt(e.target.value, 10) || 1 })}
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Interview Type
                <select
                  value={interviewForm.type}
                  onChange={(e) => {
                    const newType = e.target.value;
                    setInterviewForm({
                      ...interviewForm,
                      type: newType,
                      title: `Round ${interviewForm.round} ${newType} Interview`,
                    });
                  }}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                >
                  <option value="Technical">Technical</option>
                  <option value="HR">HR / Culture Fit</option>
                  <option value="Managerial">Managerial</option>
                  <option value="Phone">Phone Screen</option>
                  <option value="Video">Video Call</option>
                  <option value="In-Person">In-Person</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76] sm:col-span-2">
                Interview Title *
                <input
                  required
                  value={interviewForm.title}
                  onChange={(e) => setInterviewForm({ ...interviewForm, title: e.target.value })}
                  placeholder="e.g. Round 1 Technical Architecture"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Date *
                <input
                  required
                  type="date"
                  value={interviewForm.date}
                  onChange={(e) => setInterviewForm({ ...interviewForm, date: e.target.value })}
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                  Start Time *
                  <input
                    required
                    type="time"
                    value={interviewForm.startTime}
                    onChange={(e) => setInterviewForm({ ...interviewForm, startTime: e.target.value })}
                    className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                </label>

                <label className="flex flex-1 flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                  End Time *
                  <input
                    required
                    type="time"
                    value={interviewForm.endTime}
                    onChange={(e) => setInterviewForm({ ...interviewForm, endTime: e.target.value })}
                    className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Location / Platform
                <input
                  value={interviewForm.location}
                  onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })}
                  placeholder="e.g. Google Meet / Room 402"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">
                Meeting URL
                <input
                  value={interviewForm.meetingUrl}
                  onChange={(e) => setInterviewForm({ ...interviewForm, meetingUrl: e.target.value })}
                  placeholder="e.g. https://meet.google.com/xyz-abcd-efg"
                  className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none"
                />
              </label>
            </div>

            {/* Panel Selection Section */}
            <div className="space-y-2 border-t border-[#C3D9E8] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Assign Panel Members & Lead Interviewer *
                </span>
                <span className="text-[10px] text-[#5D7D94]">
                  {interviewForm.panelMembers.length} selected
                </span>
              </div>

              <input
                type="text"
                value={panelSearchQuery}
                onChange={(e) => setPanelSearchQuery(e.target.value)}
                placeholder="Search employees by name, role or department..."
                className="w-full rounded-lg border border-[#C3D9E8] px-3 py-1.5 text-xs text-[#17324A] outline-none"
              />

              <div className="max-h-[160px] overflow-y-auto space-y-1.5 border border-[#C3D9E8] rounded-lg p-2 bg-[#F8FAFC]">
                {employeesList
                  .filter((emp) => {
                    const q = panelSearchQuery.toLowerCase();
                    return (
                      emp.name.toLowerCase().includes(q) ||
                      (emp.roleTitle && emp.roleTitle.toLowerCase().includes(q)) ||
                      (emp.department && emp.department.toLowerCase().includes(q))
                    );
                  })
                  .map((emp) => {
                    const isChecked = interviewForm.panelMembers.includes(emp.id);
                    const isLead = interviewForm.leadInterviewerId === emp.id;

                    return (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between rounded p-2 text-xs transition-colors ${
                          isChecked ? 'bg-[#E8F2FA] border border-[#9FC2DC]' : 'bg-white border border-[#E2E8F0]'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const nextPanel = [...interviewForm.panelMembers, emp.id];
                                setInterviewForm({
                                  ...interviewForm,
                                  panelMembers: nextPanel,
                                  leadInterviewerId: interviewForm.leadInterviewerId || emp.id,
                                });
                              } else {
                                const nextPanel = interviewForm.panelMembers.filter((id) => id !== emp.id);
                                const nextLead =
                                  interviewForm.leadInterviewerId === emp.id
                                    ? nextPanel[0] || ''
                                    : interviewForm.leadInterviewerId;
                                setInterviewForm({
                                  ...interviewForm,
                                  panelMembers: nextPanel,
                                  leadInterviewerId: nextLead,
                                });
                              }
                            }}
                            className="rounded border-[#C3D9E8] text-[#17324A]"
                          />
                          <div>
                            <span className="font-semibold text-[#17324A]">{emp.name}</span>
                            <span className="ml-1.5 text-[10px] text-[#5D7D94]">
                              {emp.roleTitle || emp.department || 'Employee'}
                            </span>
                          </div>
                        </label>

                        {isChecked && (
                          <label className="flex items-center gap-1 cursor-pointer pl-2 text-[10px] font-bold text-[#17324A]">
                            <input
                              type="radio"
                              name="leadInterviewer"
                              checked={isLead}
                              onChange={() => setInterviewForm({ ...interviewForm, leadInterviewerId: emp.id })}
                              className="text-[#17324A]"
                            />
                            Designate Lead
                          </label>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#C3D9E8] pt-3">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingInterview}
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-50"
              >
                {isSubmittingInterview
                  ? 'Saving...'
                  : editingInterviewId
                  ? 'Update Interview'
                  : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================
          SUBMIT FEEDBACK & SCORECARD MODAL (Phase 4C-B)
      ========================= */}
      {isFeedbackModalOpen && feedbackInterview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitFeedback}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-[#C3D9E8] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#17324A]">
                  Submit Interview Feedback — Round {feedbackInterview.round}
                </h2>
                <p className="mt-1 text-xs text-[#5D7D94]">
                  Candidate: <strong className="text-[#17324A]">{selectedCandidate?.name}</strong> ·{' '}
                  {feedbackInterview.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedbackError && (
              <div className="rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] p-3 text-xs text-[#A45A5A] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{feedbackError}</span>
              </div>
            )}

            {/* Overall Score & Recommendation */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-semibold text-[#315B76] block mb-1">
                  Overall Score (1–5) *
                </label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setFeedbackOverallScore(score)}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all border ${
                        feedbackOverallScore === score
                          ? 'bg-[#17324A] text-white border-[#17324A] shadow-xs'
                          : 'bg-[#F8FAFC] text-[#334155] border-[#CBD5E1] hover:bg-[#E8F2FA]'
                      }`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-[#5D7D94]">
                  {feedbackOverallScore === 1 && '1 - Poor'}
                  {feedbackOverallScore === 2 && '2 - Below Expectations'}
                  {feedbackOverallScore === 3 && '3 - Meets Expectations'}
                  {feedbackOverallScore === 4 && '4 - Strong'}
                  {feedbackOverallScore === 5 && '5 - Exceptional'}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#315B76] block mb-1">
                  Recommendation *
                </label>
                <select
                  value={feedbackRecommendation}
                  onChange={(e) => setFeedbackRecommendation(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-semibold text-[#17324A] outline-none"
                >
                  <option value="StrongHire">Strong Hire (Exceptional candidate)</option>
                  <option value="Hire">Hire (Meets all requirements)</option>
                  <option value="Maybe">Maybe (Borderline / needs review)</option>
                  <option value="NoHire">No Hire (Does not meet bar)</option>
                  <option value="StrongNoHire">Strong No Hire (Major concerns)</option>
                </select>
              </div>
            </div>

            {/* Scorecard Criteria */}
            <div className="space-y-2 border-t border-[#E2E8F0] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17324A]">
                  Structured Scorecard Criteria
                </span>
                <span className="rounded bg-[#E8F2FA] px-2 py-0.5 text-[10px] font-bold text-[#17324A] border border-[#9FC2DC]">
                  Weighted Score: ⭐ {liveWeightedScore.toFixed(2)} / 5
                </span>
              </div>

              <div className="space-y-2.5">
                {feedbackCriteria.map((crit, idx) => (
                  <div
                    key={crit.name}
                    className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#17324A]">
                        {crit.name}{' '}
                        <span className="text-[10px] text-[#5D7D94]">({crit.weight}% weight)</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const next = [...feedbackCriteria];
                              next[idx].score = s;
                              setFeedbackCriteria(next);
                            }}
                            className={`h-6 w-6 rounded text-[11px] font-bold border transition-colors ${
                              crit.score === s
                                ? 'bg-[#315B76] text-white border-[#315B76]'
                                : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#E8F2FA]'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder={`Remarks for ${crit.name.toLowerCase()} (optional)...`}
                      value={crit.remarks}
                      onChange={(e) => {
                        const next = [...feedbackCriteria];
                        next[idx].remarks = e.target.value;
                        setFeedbackCriteria(next);
                      }}
                      className="w-full rounded border border-[#CBD5E1] bg-white px-2.5 py-1 text-xs text-[#17324A] outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* General Comments */}
            <div className="space-y-1 border-t border-[#E2E8F0] pt-2">
              <label className="text-[11px] font-semibold text-[#315B76]">
                General Feedback & Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Key strengths, areas of concern, or technical evaluation summary..."
                className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none"
              />
            </div>

            <p className="text-[10px] text-[#64748B] italic">
              🔒 Note: Feedback is immutable once submitted. Peer feedback remains confidential in blind mode until evaluation is complete.
            </p>

            <div className="flex justify-end gap-2 border-t border-[#C3D9E8] pt-3">
              <button
                type="button"
                onClick={() => setIsFeedbackModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-50 shadow-xs"
              >
                {isSubmittingFeedback ? 'Submitting & Locking...' : 'Submit & Lock Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================
          CANDIDATE SELECTION DECISION MODAL (Phase 4C-B)
      ========================= */}
      {isSelectionModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSubmitSelection}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-start justify-between border-b border-[#C3D9E8] pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#17324A]">
                  Confirm Candidate Selection Decision
                </h2>
                <p className="mt-1 text-xs text-[#5D7D94]">
                  Candidate: <strong className="text-[#17324A]">{selectedCandidate.name}</strong> ·{' '}
                  {selectedCandidate.currentRole || 'Applicant'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectionError && (
              <div className="rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] p-3 text-xs text-[#A45A5A] flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{selectionError}</span>
              </div>
            )}

            {/* Decision Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#315B76]">Decision *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionDecision('SELECT')}
                  className={`rounded-lg p-2.5 text-xs font-bold border text-left transition-all ${
                    selectionDecision === 'SELECT'
                      ? 'bg-[#DDEFE4] text-[#287047] border-[#9CC9AC] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Select Candidate
                  </div>
                  <p className="mt-0.5 text-[10px] font-normal opacity-80">
                    Advance candidate to Selected stage
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionDecision('NEXT_ROUND')}
                  className={`rounded-lg p-2.5 text-xs font-bold border text-left transition-all ${
                    selectionDecision === 'NEXT_ROUND'
                      ? 'bg-[#E8F2FA] text-[#17324A] border-[#9FC2DC] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Next Round
                  </div>
                  <p className="mt-0.5 text-[10px] font-normal opacity-80">
                    Advance to subsequent round
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionDecision('HOLD')}
                  className={`rounded-lg p-2.5 text-xs font-bold border text-left transition-all ${
                    selectionDecision === 'HOLD'
                      ? 'bg-[#FFF4D8] text-[#8A641B] border-[#E1C58C] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Place on Hold
                  </div>
                  <p className="mt-0.5 text-[10px] font-normal opacity-80">
                    Pause decision for further review
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectionDecision('REJECT')}
                  className={`rounded-lg p-2.5 text-xs font-bold border text-left transition-all ${
                    selectionDecision === 'REJECT'
                      ? 'bg-[#F3DCDC] text-[#A45A5A] border-[#D9A3A3] shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ThumbsDown className="h-3.5 w-3.5" />
                    Reject Candidate
                  </div>
                  <p className="mt-0.5 text-[10px] font-normal opacity-80">
                    Transition candidate to Rejected
                  </p>
                </button>
              </div>
            </div>

            {/* Decision Reason */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#315B76]">
                Decision Justification / Evaluation Summary *
              </label>
              <textarea
                required
                rows={3}
                value={selectionReason}
                onChange={(e) => setSelectionReason(e.target.value)}
                placeholder="Provide explicit rationale based on interview scores, consensus, and panel recommendations..."
                className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#C3D9E8] pt-3">
              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingSelection}
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-50 shadow-xs"
              >
                {isSubmittingSelection ? 'Processing Decision...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================
          CREATE / EDIT FORMAL OFFER MODAL (Phase 4C-C1)
      ========================= */}
      {isOfferModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveOffer}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#C3D9E8] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#17324A]">
                  {offerIdToEdit ? 'Edit Draft Offer' : 'Create Formal Offer'}
                </h3>
                <p className="text-xs text-[#5D7D94]">
                  {selectedCandidate.name} · {selectedJob.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="rounded-lg p-1 text-[#5D7D94] hover:bg-[#E8F2FA] hover:text-[#17324A]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {offerError && (
              <div className="rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] p-3 text-xs text-[#A45A5A] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{offerError}</span>
              </div>
            )}

            {/* Role Title & Currency */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Offered Role Title *
                </label>
                <input
                  type="text"
                  required
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Currency
                </label>
                <select
                  value={offerCurrency}
                  onChange={(e) => setOfferCurrency(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none bg-white"
                >
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>

            {/* Compensation: Annual CTC & Variable */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Annual CTC (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="100000"
                  step="10000"
                  value={offerCtc}
                  onChange={(e) => setOfferCtc(Number(e.target.value))}
                  placeholder="e.g. 1500000"
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] font-bold outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Annual Variable Pay (Optional, ₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={offerVariablePay}
                  onChange={(e) => setOfferVariablePay(Number(e.target.value))}
                  placeholder="e.g. 100000"
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none"
                />
              </div>
            </div>

            {/* Joining Date & Expiry Date */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Proposed Joining Date *
                </label>
                <input
                  type="date"
                  required
                  value={offerJoinDate}
                  onChange={(e) => setOfferJoinDate(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#315B76]">
                  Offer Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={offerExpiresAt}
                  onChange={(e) => setOfferExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs text-[#17324A] outline-none bg-white"
                />
              </div>
            </div>

            {/* Live Compensation Preview */}
            {liveCompensationPreview && (
              <div className="rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3.5 space-y-2">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5">
                  <span className="text-xs font-bold text-[#17324A]">
                    Deterministic India Compensation Preview
                  </span>
                  <span className="text-[10px] font-bold text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded">
                    Est. Monthly In-Hand: ₹{liveCompensationPreview.netTakeHomeMonthly.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Basic Salary (50%)</span>
                    <span className="font-semibold text-[#0F172A]">
                      ₹{liveCompensationPreview.basicMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">HRA (50% Basic)</span>
                    <span className="font-semibold text-[#0F172A]">
                      ₹{liveCompensationPreview.hraMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Special Allowance</span>
                    <span className="font-semibold text-[#0F172A]">
                      ₹{liveCompensationPreview.specialAllowanceMonthly.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Employer PF & Gratuity</span>
                    <span className="font-semibold text-[#0F172A]">
                      ₹{(liveCompensationPreview.pfEmployerMonthly + liveCompensationPreview.gratuityMonthly).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Conveyance & Medical</span>
                    <span className="font-semibold text-[#0F172A]">
                      ₹{(liveCompensationPreview.conveyanceMonthly + liveCompensationPreview.medicalAllowanceMonthly).toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px]">Monthly Gross</span>
                    <span className="font-bold text-[#17324A]">
                      ₹{liveCompensationPreview.monthlyGross.toLocaleString('en-IN')}/mo
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-[#C3D9E8] pt-3">
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingOffer}
                className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-50 shadow-xs"
              >
                {isSubmittingOffer
                  ? 'Saving Offer...'
                  : offerIdToEdit
                  ? 'Update Draft Offer'
                  : 'Create Offer (Draft)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Submit For Approval Modal */}
      {isSubmitApprovalModalOpen && activeOfferForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#9FC2DC] bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#17324A] p-2 text-white">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17324A]">Submit Offer for Approval</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Offer v{activeOfferForApproval.version} · {activeOfferForApproval.offered_title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitApprovalModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {approvalActionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {approvalActionError}
              </div>
            )}

            <div className="rounded-lg border border-[#9FC2DC] bg-[#F8FAFC] p-3 text-xs space-y-1.5">
              <span className="font-semibold text-[#17324A] block">Approval Route:</span>
              <div className="flex items-center gap-2 text-[11px] text-[#334155]">
                <span className="rounded bg-[#17324A] text-white px-1.5 py-0.5 text-[9px] font-bold">1</span>
                <span>HR / Admin (Single-Level Final Authorization)</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#315B76]">
                Notes for Approvers (Optional)
              </label>
              <textarea
                rows={2}
                value={approvalActionComment}
                onChange={(e) => setApprovalActionComment(e.target.value)}
                placeholder="e.g. Compensation benchmarked against candidate expectations."
                className="w-full rounded-lg border border-[#C3D9E8] p-2.5 text-xs text-[#17324A] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={() => setIsSubmitApprovalModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApprovalAction}
                onClick={handleSubmitForApproval}
                className="rounded-lg bg-[#17324A] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#315B76] disabled:opacity-50"
              >
                {isSubmittingApprovalAction ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Offer Modal */}
      {isApproveOfferModalOpen && activeOfferForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#BBF7D0] bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#166534] p-2 text-white">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#166534]">Approve Formal Offer</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Offer v{activeOfferForApproval.version} · {activeOfferForApproval.offered_title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveOfferModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {approvalActionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {approvalActionError}
              </div>
            )}

            <p className="text-xs text-[#334155]">
              Are you sure you want to approve this offer for <strong>₹{Number(activeOfferForApproval.offered_ctc || 0).toLocaleString('en-IN')}</strong>?
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#315B76]">
                Approval Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={approvalActionComment}
                onChange={(e) => setApprovalActionComment(e.target.value)}
                placeholder="e.g. Approved based on team budget and candidate evaluation."
                className="w-full rounded-lg border border-[#C3D9E8] p-2.5 text-xs text-[#17324A] outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={() => setIsApproveOfferModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApprovalAction}
                onClick={() => handleApprovalAction('APPROVE')}
                className="rounded-lg bg-[#166534] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#14532D] disabled:opacity-50"
              >
                {isSubmittingApprovalAction ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {isRequestChangesModalOpen && activeOfferForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#FED7AA] bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#EA580C] p-2 text-white">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#9A3412]">Request Offer Changes</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Offer will revert to Draft for recruiter revisions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestChangesModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {approvalActionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {approvalActionError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#9A3412]">
                Required Changes / Feedback *
              </label>
              <textarea
                rows={3}
                required
                value={approvalActionComment}
                onChange={(e) => setApprovalActionComment(e.target.value)}
                placeholder="Explain what needs to be changed (e.g. Reduce joining bonus by 50k, adjust start date to next month)..."
                className="w-full rounded-lg border border-[#FED7AA] p-2.5 text-xs text-[#17324A] outline-none focus:ring-1 focus:ring-[#EA580C]"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={() => setIsRequestChangesModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApprovalAction || !approvalActionComment.trim()}
                onClick={() => handleApprovalAction('REQUEST_CHANGES')}
                className="rounded-lg bg-[#EA580C] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#C2410C] disabled:opacity-50"
              >
                {isSubmittingApprovalAction ? 'Processing...' : 'Submit Change Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Modal */}
      {isRejectOfferModalOpen && activeOfferForApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#FECDD3] bg-white p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#E11D48] p-2 text-white">
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#9F1239]">Reject Formal Offer</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Offer will be terminated and marked as Declined
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRejectOfferModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {approvalActionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {approvalActionError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-[#9F1239]">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                value={approvalActionComment}
                onChange={(e) => setApprovalActionComment(e.target.value)}
                placeholder="State the reason for rejecting this offer..."
                className="w-full rounded-lg border border-[#FECDD3] p-2.5 text-xs text-[#17324A] outline-none focus:ring-1 focus:ring-[#E11D48]"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                onClick={() => setIsRejectOfferModalOpen(false)}
                className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApprovalAction || !approvalActionComment.trim()}
                onClick={() => handleApprovalAction('REJECT')}
                className="rounded-lg bg-[#E11D48] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#BE123C] disabled:opacity-50"
              >
                {isSubmittingApprovalAction ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          PHASE 4C-C3: DOCUMENT GENERATION MODAL
      ========================= */}
      {isDocGenModalOpen && activeOfferForDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#17324A] p-2 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17324A]">Generate Official HR Document</h3>
                  <p className="text-[11px] text-[#5D7D94]">
                    Select document template, preview dynamic variables, and generate a standardized PDF.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDocGenModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {docActionError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700">
                {docActionError}
              </div>
            )}

            {/* Document Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#17324A]">Document Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Offer_Letter', label: 'Offer Letter', desc: 'Formal job offer' },
                  { id: 'Appointment_Letter', label: 'Appointment Letter', desc: 'Formal appointment' },
                  { id: 'NDA', label: 'NDA Agreement', desc: 'Confidentiality' },
                  { id: 'Custom', label: 'Joining Letter', desc: 'Welcome & joining' },
                ].map((dt) => (
                  <button
                    key={dt.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocType(dt.id);
                      setSelectedDocTemplateId('');
                    }}
                    className={`rounded-lg border p-2.5 text-left transition-all ${
                      selectedDocType === dt.id
                        ? 'border-[#17324A] bg-[#E8F2FA] text-[#17324A] shadow-xs'
                        : 'border-[#C3D9E8] bg-white text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <span className="block text-xs font-bold">{dt.label}</span>
                    <span className="block text-[10px] text-[#64748B] mt-0.5">{dt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Selector */}
            {availableDocTemplates.filter((t) => t.type === selectedDocType || t.type === 'Custom').length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#17324A]">Select Document Template</label>
                <select
                  value={selectedDocTemplateId}
                  onChange={(e) => setSelectedDocTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-[#C3D9E8] p-2.5 text-xs text-[#17324A] outline-none"
                >
                  <option value="">Standard Default Template (v1)</option>
                  {availableDocTemplates
                    .filter((t) => t.type === selectedDocType || t.type === 'Custom')
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} (v{t.version}) {t.type !== selectedDocType ? `[${t.type}]` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Dynamic Substitution Parameters Summary */}
            <div className="rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] p-3 text-xs space-y-1.5">
              <span className="text-[11px] font-bold text-[#17324A]">Document Target Snapshot:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#475569]">
                <div>Candidate: <strong className="text-[#17324A]">{selectedCandidate?.name}</strong></div>
                <div>Offered Title: <strong className="text-[#17324A]">{activeOfferForDoc.offered_title}</strong></div>
                <div>Annual CTC: <strong className="text-[#17324A]">₹{Number(activeOfferForDoc.offered_ctc || 0).toLocaleString('en-IN')}</strong></div>
                <div>Offer Version: <strong className="text-[#17324A]">v{activeOfferForDoc.version}</strong></div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3">
              <button
                type="button"
                disabled={isPreviewingDoc}
                onClick={() => handlePreviewDocument(activeOfferForDoc.id, selectedDocType, selectedDocTemplateId)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-1.5 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
              >
                <Eye className="h-3.5 w-3.5" />
                {isPreviewingDoc ? 'Loading Preview...' : 'Preview Document'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDocGenModalOpen(false)}
                  className="rounded-lg border border-[#C3D9E8] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isGeneratingDoc}
                  onClick={handleGenerateOfficialDocument}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#17324A] px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#315B76] disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {isGeneratingDoc ? 'Generating PDF...' : 'Generate Official Document'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          PHASE 4C-C3: DOCUMENT PREVIEW MODAL
      ========================= */}
      {isDocPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/50 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-[#9FC2DC] bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#17324A]" />
                <h3 className="text-sm font-bold text-[#17324A]">{docPreviewTitle || 'Document Preview'}</h3>
                <span className="rounded bg-[#E8F2FA] px-2 py-0.5 text-[10px] font-bold text-[#17324A]">
                  Sandboxed Render
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(docPreviewHtml);
                      printWindow.document.close();
                      printWindow.print();
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#C3D9E8] bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsDocPreviewModalOpen(false)}
                  className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Preview Content iframe */}
            <div className="flex-1 overflow-hidden bg-[#F1F5F9] p-4">
              <iframe
                title="Document Preview"
                srcDoc={docPreviewHtml}
                sandbox="allow-same-origin"
                className="h-full w-full rounded-lg border border-[#CBD5E1] bg-white shadow-sm"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-2.5 bg-white text-xs">
              <span className="text-[11px] text-[#64748B]">
                Preview mode does not store files or trigger notifications.
              </span>
              <button
                type="button"
                onClick={() => setIsDocPreviewModalOpen(false)}
                className="rounded-lg bg-[#17324A] px-4 py-1 text-xs font-semibold text-white hover:bg-[#315B76]"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}