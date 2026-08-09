'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  Filter,
  Mail,
  MapPin,
  Search,
  ScanSearch,
  Sparkles,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';

import { useHRMS } from '@/context/HRMSContext';

import {
  MOCK_RECRUITMENT_CANDIDATES,
  MOCK_RECRUITMENT_JOBS,
  RecruitmentCandidate,
} from '@/data/mockData';

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

  const [selectedJobId, setSelectedJobId] = useState(
    MOCK_RECRUITMENT_JOBS[0].id
  );

  const [selectedCandidateId, setSelectedCandidateId] = useState(
    MOCK_RECRUITMENT_CANDIDATES[0].id
  );

  const [query, setQuery] = useState('');

  const [stage, setStage] =
    useState<CandidateStage>('All');

  const [candidateStages, setCandidateStages] =
    useState<
      Record<string, RecruitmentCandidate['stage']>
    >({});

  const [notice, setNotice] =
    useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] =
    useState(false);

  const selectedJob =
    MOCK_RECRUITMENT_JOBS.find(
      (job) => job.id === selectedJobId
    ) ?? MOCK_RECRUITMENT_JOBS[0];

  const jobCandidates = useMemo(
    () =>
      MOCK_RECRUITMENT_CANDIDATES.filter(
        (candidate) =>
          candidate.jobId === selectedJob.id
      ),
    [selectedJob.id]
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

  const openJobs =
    MOCK_RECRUITMENT_JOBS.filter(
      (job) => job.status === 'Open'
    ).length;

  const screenedCount =
    MOCK_RECRUITMENT_CANDIDATES.filter(
      (candidate) => candidate.score >= 70
    ).length;

  const averageScore =
    MOCK_RECRUITMENT_CANDIDATES.length
      ? Math.round(
          MOCK_RECRUITMENT_CANDIDATES.reduce(
            (sum, candidate) =>
              sum + candidate.score,
            0
          ) /
            MOCK_RECRUITMENT_CANDIDATES.length
        )
      : 0;

  const showNotice = (message: string) => {
    setNotice(message);

    window.setTimeout(
      () => setNotice(null),
      2800
    );
  };

  const updateStage = (
    nextStage: RecruitmentCandidate['stage']
  ) => {
    if (!selectedCandidate) return;

    setCandidateStages((current) => ({
      ...current,
      [selectedCandidate.id]: nextStage,
    }));

    showNotice(
      `${selectedCandidate.name} moved to ${nextStage}`
    );
  };

  /* -----------------------------
     ACCESS CONTROL
  ----------------------------- */

  if (currentUser.userRole !== 'admin' && currentUser.userRole !== 'ceo') {
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
    <div className="min-h-screen bg-[#B0D0EA] text-[#17324A] p-4 md:p-6 space-y-6">

      {/* CEO EXECUTIVE HIRING OVERVIEW & APPROVALS */}
      {currentUser.userRole === 'ceo' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Open Positions</span>
              <div className="text-xl font-black text-[#17324A] mt-1">4</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Critical Roles</span>
              <div className="text-xl font-black text-rose-700 mt-1">2</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">In Pipeline</span>
              <div className="text-xl font-black text-purple-700 mt-1">54</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Offers Out</span>
              <div className="text-xl font-black text-blue-700 mt-1">3</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Joined (Aug)</span>
              <div className="text-xl font-black text-emerald-700 mt-1">5</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Time to Hire</span>
              <div className="text-xl font-black text-[#17324A] mt-1">18 Days</div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#9FC2DC] shadow-sm">
              <span className="text-[10px] font-bold text-[#315B76] uppercase">Hiring Cost</span>
              <div className="text-xl font-black text-[#17324A] mt-1">₹1.8L / role</div>
            </div>
          </div>

          {/* CEO Approval Required Cards */}
          <div className="p-5 rounded-2xl bg-white border border-[#9FC2DC] shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17324A] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-700" />
                CEO Executive Approval Required — Offer & Budget Exceptions
              </h3>
              <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                1 Pending Approval
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#F5F9FC] border border-[#9FC2DC] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#17324A]">Senior AI/ML Lead Candidate: Sanjay Rao</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">Budget Variance +₹4L</span>
                </div>
                <p className="text-xs text-[#315B76]">
                  Hiring Manager: <strong>Arjun Mehta</strong> • Requested CTC: <strong>₹32.0 Lakhs</strong> • Approved Band: <strong>₹28.0 Lakhs</strong>
                </p>
                <p className="text-[11px] text-[#55708A]">Strong match (95% AI score). 7 years experience owning end-to-end production ML pipelines.</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => showNotice('Sanjay Rao offer approved at ₹32L CTC')}
                  className="px-4 py-2 rounded-xl bg-[#17324A] text-white text-xs font-bold shadow-xs hover:bg-[#315B76] cursor-pointer"
                >
                  Approve Offer
                </button>
                <button
                  onClick={() => showNotice('Offer request sent back to Hiring Manager for review')}
                  className="px-3 py-2 rounded-xl bg-white border border-[#9FC2DC] text-[#315B76] text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Review Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[250px_minmax(360px,1fr)_380px]">

        {/* =========================
            REQUISITIONS
        ========================= */}

        <aside className="rounded-xl border border-[#9FC2DC] bg-white p-3 shadow-sm">

          <div className="mb-3 flex items-center justify-between">

            <h2 className="text-xs font-bold uppercase tracking-wide text-[#315B76]">
              Requisitions
            </h2>

            <button
              type="button"
              onClick={() =>
                showNotice(
                  'New requisition form is ready for configuration'
                )
              }
              title="Create requisition"
              aria-label="Create requisition"
              className="rounded-md p-1.5 text-[#315B76] transition-colors hover:bg-[#B0D0EA] hover:text-[#17324A]"
            >
              <UserPlus className="h-4 w-4" />
            </button>

          </div>

          <div className="space-y-2">

            {MOCK_RECRUITMENT_JOBS.map(
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
                  className={`w-full rounded-lg border p-3 text-left transition-all ${
                    selectedJob.id === job.id
                      ? 'border-[#6FA6C9] bg-[#E8F2FA] shadow-sm'
                      : 'border-[#C3D9E8] bg-white hover:border-[#6FA6C9] hover:bg-[#F4F9FC]'
                  }`}
                >

                  <div className="flex items-start justify-between gap-2">

                    <span className="text-xs font-semibold text-[#17324A]">
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

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

              <div>

                <h2 className="text-sm font-bold text-[#17324A]">
                  {selectedJob.title}
                </h2>

                <p className="mt-1 text-xs text-[#5D7D94]">
                  {selectedJob.location} ·{' '}
                  {selectedJob.employmentType} ·
                  Posted {selectedJob.postedOn}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  showNotice(
                    'Screening queue refreshed'
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3 py-2 text-[11px] font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA]"
              >
                <ScanSearch className="h-3.5 w-3.5 text-[#315B76]" />
                Run AI screening
              </button>

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
          <section className="rounded-xl border border-[#9FC2DC] bg-white p-4 shadow-sm">

            <div className="flex items-start justify-between gap-3">

              <div className="flex items-center gap-3">

                <img
                  src={selectedCandidate.avatar}
                  alt={selectedCandidate.name}
                  className="h-12 w-12 rounded-full border border-[#9FC2DC] object-cover"
                />

                <div>

                  <h2 className="text-sm font-bold text-[#17324A]">
                    {selectedCandidate.name}
                  </h2>

                  <p className="text-xs text-[#315B76]">
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

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs">

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

                <p className="mt-1 flex items-center gap-1 font-semibold text-[#17324A]">

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

            <div className="mt-5 flex gap-2">

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