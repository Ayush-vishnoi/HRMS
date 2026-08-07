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

const stages = ['All', 'New', 'Screening', 'Interview', 'Shortlisted', 'Rejected'] as const;
type CandidateStage = (typeof stages)[number];

const scoreTone = (score: number) => {
  if (score >= 85) return { text: 'text-[#3fb950]', bar: 'bg-[#3fb950]', badge: 'bg-[#3fb950]/10 border-[#3fb950]/25' };
  if (score >= 70) return { text: 'text-[#d29922]', bar: 'bg-[#d29922]', badge: 'bg-[#d29922]/10 border-[#d29922]/25' };
  return { text: 'text-[#f85149]', bar: 'bg-[#f85149]', badge: 'bg-[#f85149]/10 border-[#f85149]/25' };
};

const stageTone = (stage: RecruitmentCandidate['stage']) => {
  if (stage === 'Shortlisted') return 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/25';
  if (stage === 'Rejected') return 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/25';
  if (stage === 'Interview') return 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/25';
  return 'bg-[#8B3A4A]/10 text-[#B86B78] border-[#8B3A4A]/25';
};

export default function RecruitmentPage() {
  const { currentUser } = useHRMS();
  const [selectedJobId, setSelectedJobId] = useState(MOCK_RECRUITMENT_JOBS[0].id);
  const [selectedCandidateId, setSelectedCandidateId] = useState(MOCK_RECRUITMENT_CANDIDATES[0].id);
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState<CandidateStage>('All');
  const [candidateStages, setCandidateStages] = useState<Record<string, RecruitmentCandidate['stage']>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const selectedJob = MOCK_RECRUITMENT_JOBS.find((job) => job.id === selectedJobId) ?? MOCK_RECRUITMENT_JOBS[0];
  const jobCandidates = useMemo(() => MOCK_RECRUITMENT_CANDIDATES.filter((candidate) => candidate.jobId === selectedJob.id), [selectedJob.id]);
  const filteredCandidates = useMemo(() => jobCandidates.filter((candidate) => {
    const currentStage = candidateStages[candidate.id] ?? candidate.stage;
    const matchesSearch = `${candidate.name} ${candidate.currentRole} ${candidate.location}`.toLowerCase().includes(query.toLowerCase());
    return matchesSearch && (stage === 'All' || currentStage === stage);
  }), [candidateStages, jobCandidates, query, stage]);
  const selectedCandidate = jobCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? jobCandidates[0];
  const openJobs = MOCK_RECRUITMENT_JOBS.filter((job) => job.status === 'Open').length;
  const screenedCount = MOCK_RECRUITMENT_CANDIDATES.filter((candidate) => candidate.score >= 70).length;

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2800);
  };

  const updateStage = (nextStage: RecruitmentCandidate['stage']) => {
    if (!selectedCandidate) return;
    setCandidateStages((current) => ({ ...current, [selectedCandidate.id]: nextStage }));
    showNotice(`${selectedCandidate.name} moved to ${nextStage}`);
  };

  if (currentUser.userRole !== 'admin') {
    return <section className="mx-auto mt-12 max-w-3xl rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center"><ScanSearch className="mx-auto h-8 w-8 text-[#B86B78]" /><h1 className="mt-3 text-lg font-bold text-[#F0F2F5]">HR access required</h1><p className="mt-1 text-sm text-[#8B949E]">Recruitment workspace is available only to HR administrators.</p></section>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-[#B86B78]">HR operations</p><h1 className="mt-1 text-2xl font-bold text-[#F0F2F5]">Recruitment</h1><p className="mt-1 text-sm text-[#8B949E]">Screen resumes against job descriptions and keep hiring decisions moving.</p></div><button type="button" onClick={() => setIsUploadOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#8B3A4A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#A04456]"><Upload className="h-4 w-4" />Upload resumes</button></div>
      {notice && <div role="status" className="flex items-center gap-2 rounded-md border border-[#3fb950]/25 bg-[#3fb950]/10 px-3 py-2 text-xs font-medium text-[#3fb950]"><Check className="h-4 w-4" />{notice}</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">Open positions</p><p className="mt-2 text-2xl font-bold text-[#F0F2F5]">{openJobs}</p><p className="mt-1 text-[11px] text-[#6e7681]">Across active hiring plans</p></div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">Candidates in pipeline</p><p className="mt-2 text-2xl font-bold text-[#F0F2F5]">{MOCK_RECRUITMENT_CANDIDATES.length}</p><p className="mt-1 text-[11px] text-[#3fb950]">{screenedCount} with a promising match</p></div><div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#8B949E]">Average match score</p><p className="mt-2 text-2xl font-bold text-[#B86B78]">{Math.round(MOCK_RECRUITMENT_CANDIDATES.reduce((sum, candidate) => sum + candidate.score, 0) / MOCK_RECRUITMENT_CANDIDATES.length)}%</p><p className="mt-1 text-[11px] text-[#6e7681]">AI-assisted JD comparison</p></div></div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[250px_minmax(360px,1fr)_380px]">
        <aside className="rounded-lg border border-[#30363d] bg-[#161b22] p-3"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-wide text-[#8B949E]">Requisitions</h2><button type="button" onClick={() => showNotice('New requisition form is ready for configuration')} title="Create requisition" aria-label="Create requisition" className="rounded-md p-1 text-[#B86B78] hover:bg-[#8B3A4A]/15"><UserPlus className="h-4 w-4" /></button></div><div className="space-y-2">{MOCK_RECRUITMENT_JOBS.map((job) => <button key={job.id} type="button" onClick={() => { setSelectedJobId(job.id); setSelectedCandidateId(MOCK_RECRUITMENT_CANDIDATES.find((candidate) => candidate.jobId === job.id)?.id ?? ''); setStage('All'); }} className={`w-full rounded-md border p-3 text-left transition-colors ${selectedJob.id === job.id ? 'border-[#8B3A4A] bg-[#8B3A4A]/10' : 'border-[#30363d] bg-[#21262d]/40 hover:border-[#484f58]'}`}><div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-[#F0F2F5]">{job.title}</span><span className={`rounded-full px-1.5 py-0.5 text-[9px] ${job.status === 'Open' ? 'bg-[#3fb950]/10 text-[#3fb950]' : 'bg-[#30363d] text-[#8B949E]'}`}>{job.status}</span></div><p className="mt-1 text-[10px] text-[#8B949E]">{job.department} · {job.openings} opening{job.openings > 1 ? 's' : ''}</p><p className="mt-2 text-[10px] text-[#6e7681]">{job.applicants} applicants</p></button>)}</div></aside>

        <section className="min-w-0 rounded-lg border border-[#30363d] bg-[#161b22]"><div className="border-b border-[#30363d] p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-sm font-bold text-[#F0F2F5]">{selectedJob.title}</h2><p className="mt-1 text-xs text-[#8B949E]">{selectedJob.location} · {selectedJob.employmentType} · Posted {selectedJob.postedOn}</p></div><button type="button" onClick={() => showNotice('Screening queue refreshed')} className="inline-flex items-center gap-1.5 rounded-md border border-[#30363d] px-2.5 py-2 text-[11px] font-semibold text-[#F0F2F5] hover:bg-[#30363d]"><ScanSearch className="h-3.5 w-3.5 text-[#B86B78]" />Run AI screening</button></div><p className="mt-3 text-xs leading-5 text-[#8B949E]">{selectedJob.description}</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e7681]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates" className="w-full rounded-md border border-[#30363d] bg-[#0d1117] py-2 pl-9 pr-3 text-xs text-[#F0F2F5] outline-none placeholder:text-[#6e7681] focus:border-[#8B3A4A]" /></label><label className="relative"><Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6e7681]" /><select value={stage} onChange={(event) => setStage(event.target.value as CandidateStage)} className="w-full appearance-none rounded-md border border-[#30363d] bg-[#0d1117] py-2 pl-8 pr-8 text-xs text-[#F0F2F5] outline-none focus:border-[#8B3A4A]"><option value="All">All stages</option>{stages.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8B949E]" /></label></div></div><div className="divide-y divide-[#30363d]">{filteredCandidates.map((candidate) => { const score = scoreTone(candidate.score); const currentStage = candidateStages[candidate.id] ?? candidate.stage; return <button key={candidate.id} type="button" onClick={() => setSelectedCandidateId(candidate.id)} className={`flex w-full items-start gap-3 p-4 text-left transition-colors ${selectedCandidate?.id === candidate.id ? 'bg-[#21262d]' : 'hover:bg-[#21262d]/60'}`}><img src={candidate.avatar} alt="" className="h-9 w-9 rounded-full border border-[#30363d] object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold text-[#F0F2F5]">{candidate.name}</p><p className="mt-0.5 truncate text-[10px] text-[#8B949E]">{candidate.currentRole}</p></div><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${score.badge} ${score.text}`}>{candidate.score}%</span></div><div className="mt-2 flex items-center justify-between gap-2"><span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${stageTone(currentStage)}`}>{currentStage}</span><span className="text-[10px] text-[#6e7681]">Applied {candidate.appliedOn}</span></div></div></button>; })}</div>{filteredCandidates.length === 0 && <p className="p-8 text-center text-xs text-[#8B949E]">No candidates match these filters.</p>}</section>

        {selectedCandidate ? <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="h-12 w-12 rounded-full border border-[#30363d] object-cover" /><div><h2 className="text-sm font-bold text-[#F0F2F5]">{selectedCandidate.name}</h2><p className="text-xs text-[#B86B78]">{selectedCandidate.currentRole}</p></div></div><button type="button" onClick={() => showNotice('Candidate profile opened')} aria-label="Open candidate profile" title="Open candidate profile" className="rounded-md p-1.5 text-[#8B949E] hover:bg-[#30363d] hover:text-[#F0F2F5]"><FileText className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between rounded-md border border-[#30363d] bg-[#21262d]/50 p-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[#8B949E]">JD match score</p><p className={`mt-1 text-3xl font-bold ${scoreTone(selectedCandidate.score).text}`}>{selectedCandidate.score}%</p></div><div className="rounded-full border border-[#B86B78]/25 bg-[#8B3A4A]/10 p-3 text-[#B86B78]"><Sparkles className="h-5 w-5" /></div></div><div className="mt-4"><div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#6e7681]"><span>Match confidence</span><span>{selectedCandidate.recommendation}</span></div><div className="mt-1.5 h-2 rounded-full bg-[#30363d]"><div className={`h-full rounded-full ${scoreTone(selectedCandidate.score).bar}`} style={{ width: `${selectedCandidate.score}%` }} /></div></div><div className="mt-5"><h3 className="text-xs font-bold text-[#F0F2F5]">AI screening summary</h3><p className="mt-2 text-xs leading-5 text-[#8B949E]">{selectedCandidate.summary}</p></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-md border border-[#30363d] bg-[#21262d]/40 p-3"><p className="text-[10px] uppercase text-[#6e7681]">Experience</p><p className="mt-1 font-semibold text-[#F0F2F5]">{selectedCandidate.experience}</p></div><div className="rounded-md border border-[#30363d] bg-[#21262d]/40 p-3"><p className="text-[10px] uppercase text-[#6e7681]">Location</p><p className="mt-1 flex items-center gap-1 font-semibold text-[#F0F2F5]"><MapPin className="h-3 w-3 text-[#B86B78]" />{selectedCandidate.location}</p></div></div><div className="mt-5"><h3 className="text-xs font-bold text-[#F0F2F5]">Matched skills</h3><div className="mt-2 flex flex-wrap gap-1.5">{selectedCandidate.matchedSkills.map((skill) => <span key={skill} className="rounded-full border border-[#3fb950]/25 bg-[#3fb950]/10 px-2 py-1 text-[10px] text-[#3fb950]"><CheckCircle2 className="mr-1 inline h-3 w-3" />{skill}</span>)}</div></div><div className="mt-4"><h3 className="text-xs font-bold text-[#F0F2F5]">Gaps to validate</h3><div className="mt-2 flex flex-wrap gap-1.5">{selectedCandidate.missingSkills.map((skill) => <span key={skill} className="rounded-full border border-[#d29922]/25 bg-[#d29922]/10 px-2 py-1 text-[10px] text-[#d29922]">{skill}</span>)}</div></div><div className="mt-5 flex gap-2"><button type="button" onClick={() => updateStage('Shortlisted')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#8B3A4A] px-2.5 py-2 text-[11px] font-semibold text-white hover:bg-[#A04456]"><Check className="h-3.5 w-3.5" />Shortlist</button><button type="button" onClick={() => updateStage('Rejected')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-[#f85149]/30 bg-[#f85149]/10 px-2.5 py-2 text-[11px] font-semibold text-[#f85149] hover:bg-[#f85149]/20"><X className="h-3.5 w-3.5" />Reject</button></div><button type="button" onClick={() => showNotice(`Email composer opened for ${selectedCandidate.name}`)} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-[#30363d] px-2.5 py-2 text-[11px] font-semibold text-[#F0F2F5] hover:bg-[#30363d]"><Mail className="h-3.5 w-3.5" />Contact candidate</button></section> : <section className="rounded-lg border border-[#30363d] bg-[#161b22] p-8 text-center text-xs text-[#8B949E]">Select a candidate to review the AI match.</section>}
      </div>

      {isUploadOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1117]/75 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="upload-title" className="w-full max-w-md rounded-lg border border-[#30363d] bg-[#161b22] p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="upload-title" className="text-sm font-bold text-[#F0F2F5]">Upload resumes</h2><p className="mt-1 text-xs text-[#8B949E]">Demo frontend flow for batch screening.</p></div><button type="button" onClick={() => setIsUploadOpen(false)} aria-label="Close upload dialog" className="rounded-md p-1 text-[#8B949E] hover:bg-[#30363d]"><X className="h-4 w-4" /></button></div><label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#8B3A4A]/60 bg-[#8B3A4A]/5 px-4 py-8 text-center hover:bg-[#8B3A4A]/10"><Upload className="h-7 w-7 text-[#B86B78]" /><span className="mt-2 text-xs font-semibold text-[#F0F2F5]">Choose PDF or DOCX resumes</span><span className="mt-1 text-[10px] text-[#6e7681]">Files stay in this demo and are not uploaded</span><input type="file" multiple accept=".pdf,.doc,.docx" className="sr-only" onChange={() => { setIsUploadOpen(false); showNotice('Resume files queued for AI screening'); }} /></label><button type="button" onClick={() => setIsUploadOpen(false)} className="mt-4 w-full rounded-md border border-[#30363d] px-3 py-2 text-xs font-semibold text-[#F0F2F5] hover:bg-[#30363d]">Cancel</button></div></div>}
    </div>
  );
}
