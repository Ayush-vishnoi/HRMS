'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Filter,
  Mail,
  MapPin,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { useHRMS } from '@/shared/providers/HRMSContext';

import {
  MOCK_RECRUITMENT_CANDIDATES,
  MOCK_RECRUITMENT_JOBS,
} from '@/features/recruitment/data/recruitment';
import type {
  RecruitmentCandidate,
  RecruitmentJob,
} from '@/features/recruitment/data/recruitment';

const stages = [
  'All',
  'New',
  'Screening',
  'Interview',
  'Shortlisted',
  'Rejected',
] as const;

type CandidateStage = (typeof stages)[number];

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

const stageTone = (
  stage: RecruitmentCandidate['stage']
) => {
  if (stage === 'Shortlisted') {
    return 'bg-[#DDEFE4] text-[#287047] border-[#9CC9AC]';
  }

  if (stage === 'Rejected') {
    return 'bg-[#F3DCDC] text-[#A45A5A] border-[#D9A3A3]';
  }

  if (stage === 'Interview') {
    return 'bg-[#DCEAF4] text-[#315B76] border-[#9FC2DC]';
  }

  return 'bg-[#E8F2FA] text-[#315B76] border-[#B0D0EA]';
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
  const [stage, setStage] = useState<CandidateStage>('All');
  const [candidateStages, setCandidateStages] = useState<
    Record<string, RecruitmentCandidate['stage']>
  >({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddJdOpen, setIsAddJdOpen] = useState(false);
  const [jdForm, setJdForm] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'Full-time' as RecruitmentJob['employmentType'],
    openings: '1',
    description: '',
    requirements: '',
  });

  const fetchRecruitmentData = async () => {
    try {
      const res = await fetch('/api/recruitment');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const fetchedJobs: RecruitmentJob[] = (json.data.jobs || []).map((j: any) => ({
            id: j.id,
            title: j.title,
            department: j.department,
            location: j.location,
            employmentType: j.employmentType === 'Contract' ? 'Contract' : 'Full-time',
            openings: Number(j.openings) || 1,
            applicants: Number(j.applicants) || 0,
            status: j.status || 'Open',
            postedOn: j.postedOn || '01 Aug 2026',
            description: j.description || '',
            requirements: Array.isArray(j.requirements) ? j.requirements : [],
          }));

          const fetchedCandidates: RecruitmentCandidate[] = (json.data.candidates || []).map((c: any) => ({
            id: c.id,
            jobId: c.jobId || c.job_id,
            name: c.name,
            email: c.email,
            phone: c.phone || '',
            avatar: c.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
            appliedOn: c.appliedOn || '06 Aug 2026',
            stage: (c.stage as any) || 'New',
            score: Number(c.score) || 80,
            experience: c.experience || '',
            currentRole: c.currentRole || '',
            location: c.location || '',
            matchedSkills: Array.isArray(c.matchedSkills) ? c.matchedSkills : [],
            missingSkills: Array.isArray(c.missingSkills) ? c.missingSkills : [],
            summary: c.summary || '',
            recommendation: c.recommendation === 'StrongMatch' ? 'Strong match' : c.recommendation === 'LowMatch' ? 'Low match' : 'Review',
          }));

          setJobs(fetchedJobs);
          setAllCandidates(fetchedCandidates);
          if (fetchedJobs.length > 0 && !selectedJobId) {
            setSelectedJobId(fetchedJobs[0].id);
          }
          if (fetchedCandidates.length > 0 && !selectedCandidateId) {
            setSelectedCandidateId(fetchedCandidates[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load recruitment data from database:', err);
    }
  };

  useEffect(() => {
    fetchRecruitmentData();
  }, []);

  const selectedJob =
    jobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? {
      id: 'JOB-001',
      title: 'Senior Frontend Engineer',
      department: 'Engineering',
      location: 'Bengaluru / Hybrid',
      employmentType: 'Full-time' as const,
      openings: 2,
      applicants: 0,
      status: 'Open' as const,
      postedOn: '01 Aug 2026',
      description: '',
      requirements: [],
    };

  const jobCandidates = useMemo(
    () =>
      allCandidates.filter(
        (candidate) =>
          candidate.jobId === selectedJob.id
      ),
    [allCandidates, selectedJob.id]
  );

  const filteredCandidates = useMemo(
    () =>
      jobCandidates.filter((candidate) => {
        const currentStage =
          candidateStages[candidate.id] ??
          candidate.stage;

        const searchText = `${candidate.name} ${candidate.currentRole} ${candidate.location}`;

        const matchesSearch =
          searchText
            .toLowerCase()
            .includes(query.toLowerCase());

        return (
          matchesSearch &&
          (stage === 'All' ||
            currentStage === stage)
        );
      }),
    [
      candidateStages,
      jobCandidates,
      query,
      stage,
    ]
  );

  const selectedCandidate =
    jobCandidates.find(
      (candidate) =>
        candidate.id === selectedCandidateId
    ) ?? jobCandidates[0];

  const openJobs = jobs.filter(
    (job) => job.status === 'Open'
  ).length;

  const screenedCount =
    allCandidates.filter(
      (candidate) => candidate.score >= 70
    ).length;

  const averageScore =
    allCandidates.length
      ? Math.round(
          allCandidates.reduce(
            (sum, candidate) =>
              sum + candidate.score,
            0
          ) /
            allCandidates.length
        )
      : 0;

  const showNotice = (message: string) => {
    setNotice(message);

    window.setTimeout(
      () => setNotice(null),
      2800
    );
  };

  const updateStage = async (
    nextStage: RecruitmentCandidate['stage']
  ) => {
    if (!selectedCandidate) return;

    setCandidateStages((current) => ({
      ...current,
      [selectedCandidate.id]: nextStage,
    }));

    setAllCandidates((prev) =>
      prev.map((c) =>
        c.id === selectedCandidate.id ? { ...c, stage: nextStage } : c
      )
    );

    showNotice(
      `${selectedCandidate.name} moved to ${nextStage}`
    );

    try {
      await fetch('/api/recruitment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          stage: nextStage,
        }),
      });
    } catch (err) {
      console.error('Failed to update candidate stage in database:', err);
    }
  };

  const addJobDescription = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const requirementsArr = jdForm.requirements
      .split(',')
      .map((requirement) => requirement.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: jdForm.title.trim(),
          department: jdForm.department.trim(),
          location: jdForm.location.trim(),
          employmentType: jdForm.employmentType,
          openings: Math.max(1, Number(jdForm.openings) || 1),
          description: jdForm.description.trim(),
          requirements: requirementsArr,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const createdJob: RecruitmentJob = {
          id: json.data.id,
          title: json.data.title,
          department: json.data.department,
          location: json.data.location,
          employmentType: json.data.employmentType === 'Contract' ? 'Contract' : 'Full-time',
          openings: Number(json.data.openings) || 1,
          applicants: 0,
          status: json.data.status || 'Open',
          postedOn: json.data.postedOn || '13 Aug 2026',
          description: json.data.description,
          requirements: json.data.requirements || [],
        };
        setJobs((current) => [createdJob, ...current]);
        setSelectedJobId(createdJob.id);
      }
    } catch (err) {
      console.error('Failed to create job in database:', err);
    }

    setSelectedCandidateId('');
    setStage('All');
    setJdForm({
      title: '',
      department: '',
      location: '',
      employmentType: 'Full-time',
      openings: '1',
      description: '',
      requirements: '',
    });
    setIsAddJdOpen(false);
    showNotice(`${jdForm.title} saved to database`);
  };


  /* -----------------------------
     ACCESS CONTROL
  ----------------------------- */

  if (currentUser.userRole !== 'admin') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="rounded-xl border border-[#9FC2DC] bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-bold text-[#17324A]">
            HR access required
          </h2>

          <p className="mt-2 text-sm text-[#315B76]">
            Recruitment workspace is available only
            to HR administrators.
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
            HR Operations
          </p>

          <h1 className="mt-1 text-xl font-bold text-[#17324A]">
            Recruitment
          </h1>

          <p className="mt-1 text-xs text-[#315B76]">
            Screen resumes against job descriptions
            and keep hiring decisions moving.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setIsUploadOpen(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#315B76]"
        >
          <Upload className="h-4 w-4" />
          Upload resumes
        </button>
      </div>

      {/* =========================
          NOTICE
      ========================= */}

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-[#9FC2DC] bg-white px-4 py-3 text-xs font-medium text-[#17324A] shadow-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-[#287047]" />
          {notice}
        </div>
      )}

      {/* =========================
          STATS
      ========================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        {/* Open Positions */}

        <div className="rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-sm transition-all hover:border-[#6FA6C9]">

          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#315B76]">
            Open positions
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17324A]">
            {openJobs}
          </p>

          <p className="mt-1 text-[11px] text-[#5D7D94]">
            Across active hiring plans
          </p>

        </div>

        {/* Candidates */}

        <div className="rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-sm transition-all hover:border-[#6FA6C9]">

          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#315B76]">
            Candidates in pipeline
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17324A]">
            {MOCK_RECRUITMENT_CANDIDATES.length}
          </p>

          <p className="mt-1 text-[11px] text-[#287047]">
            {screenedCount} with a promising match
          </p>

        </div>

        {/* Average Score */}

        <div className="rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-sm transition-all hover:border-[#6FA6C9]">

          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#315B76]">
            Average match score
          </p>

          <p className="mt-2 text-3xl font-bold text-[#17324A]">
            {averageScore}%
          </p>

          <p className="mt-1 text-[11px] text-[#5D7D94]">
            AI-assisted JD comparison
          </p>

        </div>
      </div>

      {/* =========================
          MAIN RECRUITMENT AREA
      ========================= */}

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)_320px]">

        {/* =========================
            REQUISITIONS
        ========================= */}

        <aside className="min-w-0 rounded-xl border border-[#9FC2DC] bg-white p-3 shadow-sm">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-xs font-bold uppercase tracking-wide text-[#315B76]">
              Requisitions
            </h2>

            <button
              type="button"
              onClick={() => setIsAddJdOpen(true)}
              title="Add job description"
              aria-label="Add job description"
              className="inline-flex items-center gap-1 rounded-md border border-[#9FC2DC] bg-[#F4F9FC] px-2 py-1.5 text-[10px] font-semibold text-[#315B76] transition-colors hover:bg-[#E8F2FA] hover:text-[#17324A]"
            >
              <FileText className="h-3.5 w-3.5" />
              Add JD
            </button>

          </div>

          <div className="space-y-2">

            {jobs.map(
              (job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => {
                    setSelectedJobId(job.id);

                    setSelectedCandidateId(
                      MOCK_RECRUITMENT_CANDIDATES.find(
                        (candidate) =>
                          candidate.jobId === job.id
                      )?.id ?? ''
                    );

                    setStage('All');
                  }}
                  className={`min-w-0 w-full rounded-lg border p-3 text-left transition-all ${
                    selectedJob.id === job.id
                      ? 'border-[#6FA6C9] bg-[#E8F2FA] shadow-sm'
                      : 'border-[#C3D9E8] bg-white hover:border-[#6FA6C9] hover:bg-[#F4F9FC]'
                  }`}
                >

                  <div className="flex items-start justify-between gap-2">

                    <span className="min-w-0 break-words text-xs font-semibold text-[#17324A]">
                      {job.title}
                    </span>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        job.status === 'Open'
                          ? 'bg-[#DDEFE4] text-[#287047]'
                          : 'bg-[#E8F2FA] text-[#5D7D94]'
                      }`}
                    >
                      {job.status}
                    </span>

                  </div>

                  <p className="mt-1 text-[10px] text-[#315B76]">
                    {job.department} · {job.openings}{' '}
                    opening
                    {job.openings > 1
                      ? 's'
                      : ''}
                  </p>

                  <p className="mt-2 text-[10px] text-[#5D7D94]">
                    {job.applicants} applicants
                  </p>

                </button>
              )
            )}

          </div>
        </aside>

        {/* =========================
            CANDIDATE LIST
        ========================= */}

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#9FC2DC] bg-white shadow-sm">

          <div className="border-b border-[#C3D9E8] p-4">

            <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div className="min-w-0">

                <h2 className="text-sm font-bold text-[#17324A]">
                  {selectedJob.title}
                </h2>

                <p className="mt-1 text-xs text-[#5D7D94]">
                  {selectedJob.location} ·{' '}
                  {selectedJob.employmentType} ·
                  Posted {selectedJob.postedOn}
                </p>

              </div>

            </div>

            <p className="mt-3 text-xs leading-5 text-[#315B76]">
              {selectedJob.description}
            </p>

            {/* Search + Filter */}

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">

              <label className="relative flex-1">

                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F91A8]" />

                <input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search candidates"
                  className="w-full rounded-lg border border-[#9FC2DC] bg-[#F8FBFD] py-2.5 pl-9 pr-3 text-xs text-[#17324A] outline-none placeholder:text-[#6F91A8] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]"
                />

              </label>

              <label className="relative">

                <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F91A8]" />

                <select
                  value={stage}
                  onChange={(event) =>
                    setStage(
                      event.target.value as CandidateStage
                    )
                  }
                  className="w-full appearance-none rounded-lg border border-[#9FC2DC] bg-[#F8FBFD] py-2.5 pl-8 pr-8 text-xs text-[#17324A] outline-none focus:border-[#6FA6C9] sm:w-40"
                >

                  <option value="All">
                    All stages
                  </option>

                  {stages
                    .slice(1)
                    .map((item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    ))}

                </select>

                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6F91A8]" />

              </label>

            </div>
          </div>

          {/* Candidate list */}

          <div className="divide-y divide-[#C3D9E8]">

            {filteredCandidates.map(
              (candidate) => {

                const score =
                  scoreTone(candidate.score);

                const currentStage =
                  candidateStages[candidate.id] ??
                  candidate.stage;

                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() =>
                      setSelectedCandidateId(
                        candidate.id
                      )
                    }
                    className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${
                      selectedCandidate?.id ===
                      candidate.id
                        ? 'bg-[#E8F2FA]'
                        : 'hover:bg-[#F4F9FC]'
                    }`}
                  >

                    <img
                      src={candidate.avatar}
                      alt=""
                      className="h-10 w-10 rounded-full border border-[#9FC2DC] object-cover"
                    />

                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <div>

                          <p className="text-xs font-semibold text-[#17324A]">
                            {candidate.name}
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-[#5D7D94]">
                            {candidate.currentRole}
                          </p>

                        </div>

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${score.badge} ${score.text}`}
                        >
                          {candidate.score}%
                        </span>

                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">

                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-medium ${stageTone(
                            currentStage
                          )}`}
                        >
                          {currentStage}
                        </span>

                        <span className="text-[10px] text-[#6F91A8]">
                          Applied {candidate.appliedOn}
                        </span>

                      </div>

                    </div>

                  </button>
                );
              }
            )}

          </div>

          {filteredCandidates.length === 0 && (
            <p className="p-8 text-center text-xs text-[#5D7D94]">
              No candidates match these filters.
            </p>
          )}

        </section>

        {/* =========================
            CANDIDATE DETAILS
        ========================= */}

        {selectedCandidate ? (
          <section className="min-w-0 overflow-hidden rounded-xl border border-[#9FC2DC] bg-white p-4 shadow-sm xl:col-span-2 2xl:col-span-1">

            <div className="flex min-w-0 items-start justify-between gap-3">

              <div className="flex min-w-0 items-center gap-3">

                <img
                  src={selectedCandidate.avatar}
                  alt={selectedCandidate.name}
                  className="h-12 w-12 rounded-full border border-[#9FC2DC] object-cover"
                />

                <div className="min-w-0">

                  <h2 className="truncate text-sm font-bold text-[#17324A]">
                    {selectedCandidate.name}
                  </h2>

                  <p className="break-words text-xs text-[#315B76]">
                    {selectedCandidate.currentRole}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  showNotice(
                    'Candidate profile opened'
                  )
                }
                aria-label="Open candidate profile"
                title="Open candidate profile"
                className="rounded-md p-1.5 text-[#5D7D94] transition-colors hover:bg-[#E8F2FA] hover:text-[#17324A]"
              >
                <FileText className="h-4 w-4" />
              </button>

            </div>

            {/* Match Score */}

            <div className="mt-4 flex items-center justify-between rounded-lg border border-[#9FC2DC] bg-[#E8F2FA] p-3">

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#5D7D94]">
                  JD match score
                </p>

                <p
                  className={`mt-1 text-3xl font-bold ${
                    scoreTone(
                      selectedCandidate.score
                    ).text
                  }`}
                >
                  {selectedCandidate.score}%
                </p>

              </div>

              <div className="rounded-full border border-[#9FC2DC] bg-white p-3 text-[#315B76]">

                <Sparkles className="h-5 w-5" />

              </div>

            </div>

            {/* Match Confidence */}

            <div className="mt-4">

              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#5D7D94]">

                <span>
                  Match confidence
                </span>

                <span>
                  {selectedCandidate.recommendation}
                </span>

              </div>

              <div className="mt-1.5 h-2 rounded-full bg-[#DCEAF4]">

                <div
                  className={`h-full rounded-full ${
                    scoreTone(
                      selectedCandidate.score
                    ).bar
                  }`}
                  style={{
                    width: `${selectedCandidate.score}%`,
                  }}
                />

              </div>

            </div>

            {/* AI Summary */}

            <div className="mt-5">

              <h3 className="text-xs font-bold text-[#17324A]">
                AI screening summary
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#315B76]">
                {selectedCandidate.summary}
              </p>

            </div>

            {/* Experience + Location */}

            <div className="mt-5 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">

              <div className="rounded-lg border border-[#C3D9E8] bg-[#F4F9FC] p-3">

                <p className="text-[10px] uppercase text-[#6F91A8]">
                  Experience
                </p>

                <p className="mt-1 font-semibold text-[#17324A]">
                  {selectedCandidate.experience}
                </p>

              </div>

              <div className="rounded-lg border border-[#C3D9E8] bg-[#F4F9FC] p-3">

                <p className="text-[10px] uppercase text-[#6F91A8]">
                  Location
                </p>

                <p className="mt-1 flex min-w-0 items-center gap-1 break-words font-semibold text-[#17324A]">

                  <MapPin className="h-3 w-3 text-[#315B76]" />

                  {selectedCandidate.location}

                </p>

              </div>

            </div>

            {/* Matched Skills */}

            <div className="mt-5">

              <h3 className="text-xs font-bold text-[#17324A]">
                Matched skills
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">

                {selectedCandidate.matchedSkills.map(
                  (skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[#9CC9AC] bg-[#DDEFE4] px-2 py-1 text-[10px] text-[#287047]"
                    >
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>

            {/* Missing Skills */}

            <div className="mt-4">

              <h3 className="text-xs font-bold text-[#17324A]">
                Gaps to validate
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">

                {selectedCandidate.missingSkills.map(
                  (skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[#E1C58C] bg-[#FFF4D8] px-2 py-1 text-[10px] text-[#8A641B]"
                    >
                      {skill}
                    </span>
                  )
                )}

              </div>

            </div>

            {/* Actions */}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">

              <button
                type="button"
                onClick={() =>
                  updateStage('Shortlisted')
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#17324A] px-2.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#315B76]"
              >
                <Check className="h-3.5 w-3.5" />
                Shortlist
              </button>

              <button
                type="button"
                onClick={() =>
                  updateStage('Rejected')
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#D9A3A3] bg-[#F3DCDC] px-2.5 py-2 text-[11px] font-semibold text-[#A45A5A] transition-colors hover:bg-[#EFD0D0]"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>

            </div>

            {/* Contact */}

            <button
              type="button"
              onClick={() =>
                showNotice(
                  `Email composer opened for ${selectedCandidate.name}`
                )
              }
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-2.5 py-2 text-[11px] font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA]"
            >
              <Mail className="h-3.5 w-3.5" />
              Contact candidate
            </button>

          </section>
        ) : (
          <section className="rounded-xl border border-[#9FC2DC] bg-white p-8 text-center text-xs text-[#5D7D94]">
            Select a candidate to review the AI match.
          </section>
        )}

      </div>

      {/* =========================
          ADD JOB DESCRIPTION MODAL
      ========================= */}

      {isAddJdOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/30 p-4 backdrop-blur-sm">
          <form
            onSubmit={addJobDescription}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[#17324A]">Add job description</h2>
                <p className="mt-1 text-xs text-[#5D7D94]">Create a requisition and define the role requirements.</p>
              </div>
              <button type="button" onClick={() => setIsAddJdOpen(false)} aria-label="Close add job description dialog" className="rounded-md p-1.5 text-[#5D7D94] hover:bg-[#E8F2FA] hover:text-[#17324A]"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Job title<input required value={jdForm.title} onChange={(event) => setJdForm((current) => ({ ...current, title: event.target.value }))} placeholder="e.g. Product Designer" className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Department<input required value={jdForm.department} onChange={(event) => setJdForm((current) => ({ ...current, department: event.target.value }))} placeholder="e.g. Engineering" className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Location<input required value={jdForm.location} onChange={(event) => setJdForm((current) => ({ ...current, location: event.target.value }))} placeholder="e.g. Bengaluru / Hybrid" className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Employment type<select value={jdForm.employmentType} onChange={(event) => setJdForm((current) => ({ ...current, employmentType: event.target.value as RecruitmentJob['employmentType'] }))} className="rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]"><option>Full-time</option><option>Contract</option></select></label>
              <label className="flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Openings<input required min="1" type="number" value={jdForm.openings} onChange={(event) => setJdForm((current) => ({ ...current, openings: event.target.value }))} className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>
            </div>

            <label className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Job description<textarea required rows={3} value={jdForm.description} onChange={(event) => setJdForm((current) => ({ ...current, description: event.target.value }))} placeholder="Describe the role, responsibilities, and outcomes" className="resize-y rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>
            <label className="mt-3 flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]">Required skills <span className="font-normal text-[#6F91A8]">Comma-separated</span><input required value={jdForm.requirements} onChange={(event) => setJdForm((current) => ({ ...current, requirements: event.target.value }))} placeholder="React, TypeScript, Communication" className="rounded-lg border border-[#C3D9E8] px-3 py-2 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" /></label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setIsAddJdOpen(false)} className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3 py-2 text-xs font-semibold text-[#17324A] hover:bg-[#E8F2FA]">Cancel</button><button type="submit" className="rounded-lg bg-[#17324A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#315B76]">Add JD</button></div>
          </form>
        </div>
      )}

      {/* =========================
          UPLOAD MODAL
      ========================= */}

      {isUploadOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/30 p-4 backdrop-blur-sm">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
            className="w-full max-w-md rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-2xl"
          >

            <div className="flex items-start justify-between">

              <div>

                <h2
                  id="upload-title"
                  className="text-sm font-bold text-[#17324A]"
                >
                  Upload resumes
                </h2>

                <p className="mt-1 text-xs text-[#5D7D94]">
                  Demo frontend flow for batch
                  screening.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setIsUploadOpen(false)
                }
                aria-label="Close upload dialog"
                className="rounded-md p-1.5 text-[#5D7D94] transition-colors hover:bg-[#E8F2FA] hover:text-[#17324A]"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#6FA6C9] bg-[#E8F2FA] px-4 py-8 text-center transition-colors hover:bg-[#DCEAF4]">

              <Upload className="h-7 w-7 text-[#315B76]" />

              <span className="mt-2 text-xs font-semibold text-[#17324A]">
                Choose PDF or DOCX resumes
              </span>

              <span className="mt-1 text-[10px] text-[#6F91A8]">
                Files stay in this demo and are not
                uploaded
              </span>

              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={() => {
                  setIsUploadOpen(false);

                  showNotice(
                    'Resume files queued for AI screening'
                  );
                }}
              />

            </label>

            <button
              type="button"
              onClick={() =>
                setIsUploadOpen(false)
              }
              className="mt-4 w-full rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3 py-2 text-xs font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA]"
            >
              Cancel
            </button>

          </div>

        </div>
      )}

    </div>
  );
}