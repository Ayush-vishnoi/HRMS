'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import type { RecruitmentJob } from '@/features/recruitment/data/recruitment';

/* ============================================================
   Resume review queue (review-then-create flow)
   - Files are held client-side; each is POSTed to
     /api/recruitment/candidates/parse-draft for a stateless parse.
   - Nothing is saved until HR reviews the pre-filled form and
     confirms, which POSTs the file + reviewed fields to
     /api/recruitment/candidates/from-resume.
   - Every file is processed independently: parse failures and
     skipped files never become candidate records.
   ============================================================ */

type QueueStatus = 'parsing' | 'ready' | 'creating' | 'created' | 'failed' | 'skipped';

interface ParsedSkill {
  name: string;
  category: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number;
  occurrences: number;
}

interface ParsedWorkHistory {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  durationYears?: number;
  description?: string;
}

interface ParsedEducation {
  degree: string;
  institution: string;
  year?: string;
  fieldOfStudy?: string;
}

interface ParsedCertification {
  name: string;
  issuer?: string;
  year?: string;
}

interface ParsedDraft {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  currentRole?: string;
  currentCompany?: string;
  totalExperienceYears: number;
  experienceDisplay: string;
  skills: ParsedSkill[];
  topSkills: string[];
  workHistory: ParsedWorkHistory[];
  education: ParsedEducation[];
  certifications: ParsedCertification[];
  socialLinks: { linkedin?: string; github?: string; portfolio?: string };
  summary: string;
  provenance: Record<string, 'PARSED' | 'MANUAL' | 'SYSTEM'>;
  parserVersion: string;
}

interface ReviewForm {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  currentRole: string;
  experience: string;
  summary: string;
  source: string;
  tags: string;
}

interface QueueItem {
  id: string;
  file: File;
  status: QueueStatus;
  error?: string;
  warning?: string;
  parsed?: ParsedDraft;
  form: ReviewForm;
}

const SOURCE_OPTIONS: readonly string[] = [
  'CareerPage',
  'Referral',
  'LinkedIn',
  'Naukri',
  'Indeed',
  'Other',
];

const STATUS_META: Record<QueueStatus, { label: string; className: string }> = {
  parsing: { label: 'Parsing', className: 'bg-[#E8F2FA] text-[#315B76] border-[#9FC2DC]' },
  ready: { label: 'Needs review', className: 'bg-[#FFF7E6] text-[#92600A] border-[#F0D48A]' },
  creating: { label: 'Creating', className: 'bg-[#E8F2FA] text-[#315B76] border-[#9FC2DC]' },
  created: { label: 'Created', className: 'bg-[#EAF7EC] text-[#1E6B33] border-[#A7D8B4]' },
  failed: { label: 'Parse failed', className: 'bg-[#FDECEC] text-[#A12622] border-[#F2B8B5]' },
  skipped: { label: 'Skipped', className: 'bg-[#F1F5F9] text-[#5B768F] border-[#D9E5EE]' },
};

const inputCls =
  'w-full rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs text-[#17324A] outline-none transition focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40';
const labelCls = 'flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]';

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const confidenceBadge = (c: ParsedSkill['confidence']) =>
  ({
    HIGH: 'bg-[#EAF7EC] text-[#1E6B33]',
    MEDIUM: 'bg-[#FFF7E6] text-[#92600A]',
    LOW: 'bg-[#F1F5F9] text-[#5B768F]',
  })[c];

interface ResumeReviewQueueProps {
  jobs: RecruitmentJob[];
  defaultJobId: string;
  onClose: () => void;
  onCandidateCreated: (message: string) => void;
}

export default function ResumeReviewQueue({
  jobs,
  defaultJobId,
  onClose,
  onCandidateCreated,
}: ResumeReviewQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeItem = queue.find((q) => q.id === activeId) || queue[0] || null;

  const counts = useMemo(
    () => ({
      total: queue.length,
      created: queue.filter((q) => q.status === 'created').length,
      skipped: queue.filter((q) => q.status === 'skipped').length,
      failed: queue.filter((q) => q.status === 'failed').length,
      pending: queue.filter((q) => q.status === 'parsing' || q.status === 'ready' || q.status === 'creating')
        .length,
    }),
    [queue]
  );

  const missingFields = useMemo(() => {
    if (!activeItem?.parsed) return [] as string[];
    const p = activeItem.parsed.provenance || {};
    const missing: string[] = [];
    if (p.name === 'MANUAL' || !activeItem.parsed.name) missing.push('Name');
    if (p.email === 'MANUAL' || !activeItem.parsed.email) missing.push('Email');
    if (p.phone === 'MANUAL' || !activeItem.parsed.phone) missing.push('Phone');
    return missing;
  }, [activeItem]);

  const formFromDraft = (draft: ParsedDraft): ReviewForm => ({
    jobId: defaultJobId || jobs[0]?.id || '',
    name: draft.name || '',
    email: draft.email || '',
    phone: draft.phone || '',
    location: draft.location || '',
    currentRole: draft.currentRole || '',
    experience: draft.experienceDisplay || '',
    summary: draft.summary || '',
    source: 'Other',
    tags: (draft.topSkills || []).slice(0, 3).join(', '),
  });

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const stamp = Date.now();
    const newItems: QueueItem[] = Array.from(files).map((file, idx) => ({
      id: `${file.name}-${file.size}-${stamp}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      status: 'parsing' as QueueStatus,
      form: {
        jobId: '',
        name: '',
        email: '',
        phone: '',
        location: '',
        currentRole: '',
        experience: '',
        summary: '',
        source: 'Other',
        tags: '',
      },
    }));
    setQueue((prev) => [...prev, ...newItems]);
    if (!activeId) setActiveId(newItems[0].id);
    newItems.forEach((item) => void parseOne(item));
  };

  const parseOne = async (item: QueueItem) => {
    const patch = (status: QueueStatus, error?: string, parsed?: ParsedDraft) =>
      setQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status,
                error,
                parsed: parsed ?? q.parsed,
                form: parsed ? formFromDraft(parsed) : q.form,
              }
            : q
        )
      );
    try {
      const fd = new FormData();
      fd.append('file', item.file);
      const json = await authFetch<{
        success: boolean;
        error?: string;
        parsedData: ParsedDraft;
      }>('/api/recruitment/candidates/parse-draft', {
        method: 'POST',
        body: fd,
      });
      if (!json?.success) {
        patch('failed', json?.error || 'Resume could not be parsed.');
        return;
      }
      patch('ready', undefined, json.parsedData);
    } catch (err: any) {
      patch('failed', err?.message || 'Network error while parsing resume.');
    }
  };

  const updateActiveForm = (patchObj: Partial<ReviewForm>) => {
    if (!activeItem) return;
    setQueue((prev) =>
      prev.map((q) => (q.id === activeItem.id ? { ...q, form: { ...q.form, ...patchObj } } : q))
    );
  };

  const focusNextPending = (excludeId: string) => {
    const next = queue.find(
      (q) => q.id !== excludeId && (q.status === 'ready' || q.status === 'parsing')
    );
    if (next) setActiveId(next.id);
  };

  const skipActive = () => {
    if (!activeItem || activeItem.status !== 'ready') return;
    setQueue((prev) => prev.map((q) => (q.id === activeItem.id ? { ...q, status: 'skipped' } : q)));
    focusNextPending(activeItem.id);
  };

  const createActive = async () => {
    if (!activeItem || activeItem.status !== 'ready') return;
    const f = activeItem.form;
    if (!f.jobId || !f.name.trim() || !f.email.trim()) return;

    setQueue((prev) =>
      prev.map((q) => (q.id === activeItem.id ? { ...q, status: 'creating', error: undefined } : q))
    );
    try {
      const fd = new FormData();
      fd.append('file', activeItem.file);
      fd.append(
        'fields',
        JSON.stringify({
          jobId: f.jobId,
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim() || undefined,
          experience: f.experience.trim() || undefined,
          currentRole: f.currentRole.trim() || undefined,
          location: f.location.trim() || undefined,
          summary: f.summary.trim() || undefined,
          source: f.source,
          tags: f.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        })
      );
      const json = await authFetch<{
        success: boolean;
        error?: string;
        warning?: string;
      }>('/api/recruitment/candidates/from-resume', {
        method: 'POST',
        body: fd,
      });
      if (!json?.success) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === activeItem.id
              ? { ...q, status: 'ready', error: json?.error || 'Failed to create candidate.' }
              : q
          )
        );
        return;
      }
      const warning: string | undefined = json.warning;
      setQueue((prev) => prev.map((q) => (q.id === activeItem.id ? { ...q, status: 'created', warning } : q)));
      onCandidateCreated(
        `Candidate "${f.name.trim()}" created${warning ? ' — with a resume-attachment warning' : ' with resume attached'}.`
      );
      focusNextPending(activeItem.id);
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === activeItem.id
            ? { ...q, status: 'ready', error: err?.message || 'Network error while creating candidate.' }
            : q
        )
      );
    }
  };

  const manualNote = (key: 'name' | 'email' | 'phone') =>
    activeItem?.parsed?.provenance?.[key] === 'MANUAL' ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#92600A]">
        <AlertTriangle className="h-3 w-3" /> not detected — enter manually
      </span>
    ) : null;

  const canCreate =
    !!activeItem &&
    activeItem.status === 'ready' &&
    !!activeItem.form.jobId &&
    activeItem.form.name.trim().length > 0 &&
    activeItem.form.email.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#9FC2DC] bg-white shadow-2xl">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#C3D9E8] px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-[#315B76]" />
              <h2 className="text-sm font-bold text-[#17324A]">Resume review queue</h2>
            </div>
            <p className="mt-1 text-xs text-[#5D7D94]">
              Parsed fields are pre-filled for review — nothing is saved until you confirm. The original
              file stays on this device until then.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#5D7D94] transition-colors hover:bg-[#E8F2FA]"
            aria-label="Close resume review queue"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {queue.length === 0 ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-8">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
              className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#6FA6C9] bg-[#E8F2FA] px-4 py-12 text-center transition-colors hover:bg-[#DCEAF4]"
            >
              <Upload className="h-8 w-8 text-[#315B76]" />
              <span className="mt-2 text-xs font-semibold text-[#17324A]">
                Drop resumes here or click to browse
              </span>
              <span className="mt-1 text-[10px] text-[#6F91A8]">
                PDF, DOCX or TXT · up to 10 MB each · one review card per file
              </span>
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[250px_1fr]">
            {/* Queue list */}
            <div className="min-h-0 space-y-2 overflow-y-auto border-r border-[#DCEAF4] bg-[#F8FCFE] p-3">
              {queue.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={`w-full rounded-lg border p-2.5 text-left transition ${
                    item.id === activeItem?.id
                      ? 'border-[#6FA6C9] bg-white shadow-sm'
                      : 'border-transparent hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#315B76]" />
                    <span className="truncate text-[11px] font-semibold text-[#17324A]">
                      {item.file.name}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 pl-5">
                    <span className="text-[10px] text-[#6F91A8]">{formatBytes(item.file.size)}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_META[item.status].className}`}
                    >
                      {STATUS_META[item.status].label}
                    </span>
                  </div>
                </button>
              ))}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#9FC2DC] px-2 py-2 text-[10px] font-semibold text-[#315B76] transition-colors hover:bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add more files
              </button>
            </div>

            {/* Detail pane */}
            <div className="min-h-0 overflow-y-auto p-5">
              {!activeItem ? (
                <p className="text-xs text-[#5D7D94]">Select a file from the queue to review it.</p>
              ) : activeItem.status === 'parsing' ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-[#DCEAF4] bg-[#F8FCFE] p-10 text-center">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-[#B0D0EA]" />
                  <p className="text-xs font-semibold text-[#17324A]">Extracting and parsing resume…</p>
                  <p className="text-[10px] text-[#6F91A8]">{activeItem.file.name}</p>
                </div>
              ) : activeItem.status === 'failed' ? (
                <div className="space-y-3 rounded-lg border border-[#F2B8B5] bg-[#FDF4F4] p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#A12622]" />
                    <div>
                      <p className="text-xs font-bold text-[#A12622]">This file was not added as a candidate</p>
                      <p className="mt-1 break-words text-[11px] text-[#17324A]">{activeItem.error}</p>
                      <p className="mt-1 text-[10px] text-[#6F91A8]">
                        Nothing was saved. Fix or re-export the file and add it again if it is a valid resume.
                      </p>
                    </div>
                  </div>
                </div>
              ) : activeItem.status === 'skipped' ? (
                <div className="rounded-lg border border-[#D9E5EE] bg-[#F1F5F9] p-4">
                  <p className="text-xs font-bold text-[#5B768F]">Skipped</p>
                  <p className="mt-1 text-[11px] text-[#17324A]">
                    No candidate record was created for <strong>{activeItem.file.name}</strong>.
                  </p>
                </div>
              ) : activeItem.status === 'created' ? (
                <div className="space-y-3 rounded-lg border border-[#A7D8B4] bg-[#F4FBF5] p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1E6B33]" />
                    <div>
                      <p className="text-xs font-bold text-[#1E6B33]">Candidate created</p>
                      <p className="mt-1 text-[11px] text-[#17324A]">
                        <strong>{activeItem.form.name}</strong> was added to the pipeline with the original
                        resume attached — viewable and downloadable from the candidate profile.
                      </p>
                      {activeItem.warning && (
                        <p className="mt-2 flex items-start gap-1.5 rounded border border-[#F0D48A] bg-[#FFF7E6] px-2 py-1.5 text-[10px] font-semibold text-[#92600A]">
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {activeItem.warning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* status: 'ready' | 'creating' — editable review form */
                <div className="space-y-5">
                  {missingFields.length > 0 && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#F0D48A] bg-[#FFF7E6] px-3 py-2 text-[11px] text-[#92600A]">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Parser could not detect: <strong>{missingFields.join(', ')}</strong>. Please complete
                        these fields before creating the candidate.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-[#315B76]" />
                      <p className="text-xs font-bold text-[#17324A]">{activeItem.file.name}</p>
                    </div>
                    <p className="text-[10px] text-[#6F91A8]">
                      {formatBytes(activeItem.file.size)} · pre-filled from parse — edit before saving
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelCls}>
                      <span>Requisition *</span>
                      <select
                        className={inputCls}
                        value={activeItem.form.jobId}
                        onChange={(e) => updateActiveForm({ jobId: e.target.value })}
                      >
                        <option value="">Select a job…</option>
                        {jobs.map((job) => (
                          <option key={job.id} value={job.id}>
                            {job.title} · {job.department} ({job.status})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={labelCls}>
                      <span className="flex items-center justify-between gap-2">
                        <span>Full name *</span>
                        {manualNote('name')}
                      </span>
                      <input
                        className={inputCls}
                        value={activeItem.form.name}
                        onChange={(e) => updateActiveForm({ name: e.target.value })}
                        placeholder="Candidate name"
                      />
                    </label>

                    <label className={labelCls}>
                      <span className="flex items-center justify-between gap-2">
                        <span>Email *</span>
                        {manualNote('email')}
                      </span>
                      <input
                        className={inputCls}
                        type="email"
                        value={activeItem.form.email}
                        onChange={(e) => updateActiveForm({ email: e.target.value })}
                        placeholder="name@example.com"
                      />
                    </label>

                    <label className={labelCls}>
                      <span className="flex items-center justify-between gap-2">
                        <span>Phone</span>
                        {manualNote('phone')}
                      </span>
                      <input
                        className={inputCls}
                        value={activeItem.form.phone}
                        onChange={(e) => updateActiveForm({ phone: e.target.value })}
                        placeholder="+91 …"
                      />
                    </label>

                    <label className={labelCls}>
                      <span>Current role</span>
                      <input
                        className={inputCls}
                        value={activeItem.form.currentRole}
                        onChange={(e) => updateActiveForm({ currentRole: e.target.value })}
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </label>

                    <label className={labelCls}>
                      <span>Location</span>
                      <input
                        className={inputCls}
                        value={activeItem.form.location}
                        onChange={(e) => updateActiveForm({ location: e.target.value })}
                        placeholder="e.g. Bengaluru, India"
                      />
                    </label>

                    <label className={labelCls}>
                      <span>Experience</span>
                      <input
                        className={inputCls}
                        value={activeItem.form.experience}
                        onChange={(e) => updateActiveForm({ experience: e.target.value })}
                        placeholder="e.g. 6 years"
                      />
                    </label>

                    <label className={labelCls}>
                      <span>Source</span>
                      <select
                        className={inputCls}
                        value={activeItem.form.source}
                        onChange={(e) => updateActiveForm({ source: e.target.value })}
                      >
                        {SOURCE_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={`${labelCls} sm:col-span-2`}>
                      <span>Tags (comma-separated)</span>
                      <input
                        className={inputCls}
                        value={activeItem.form.tags}
                        onChange={(e) => updateActiveForm({ tags: e.target.value })}
                        placeholder="e.g. React, AWS, Referral"
                      />
                    </label>

                    <label className={`${labelCls} sm:col-span-2`}>
                      <span>Summary</span>
                      <textarea
                        className={`${inputCls} min-h-[70px] resize-y`}
                        value={activeItem.form.summary}
                        onChange={(e) => updateActiveForm({ summary: e.target.value })}
                        placeholder="Short professional summary"
                      />
                    </label>
                  </div>

                  {/* Read-only parser output */}
                  {activeItem.parsed && (
                    <div className="space-y-4 rounded-lg border border-[#DCEAF4] bg-[#F8FCFE] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                          Parser output (read-only)
                        </p>
                        <span className="rounded-full border border-[#9FC2DC] bg-white px-2 py-0.5 text-[9px] font-bold text-[#315B76]">
                          {activeItem.parsed.parserVersion}
                        </span>
                      </div>

                      {activeItem.parsed.skills.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                            Detected skills ({activeItem.parsed.skills.length})
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {activeItem.parsed.skills.slice(0, 15).map((s) => (
                              <span
                                key={s.name}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceBadge(s.confidence)}`}
                              >
                                {s.name}
                                <span className="text-[8px] font-bold opacity-70">{s.confidence}</span>
                              </span>
                            ))}
                            {activeItem.parsed.skills.length > 15 && (
                              <span className="text-[10px] text-[#6F91A8]">
                                +{activeItem.parsed.skills.length - 15} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {activeItem.parsed.workHistory.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                            Work history
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {activeItem.parsed.workHistory.map((w, i) => (
                              <li key={i} className="text-[11px] text-[#17324A]">
                                <span className="font-semibold">{w.role || 'Role'}</span>
                                <span className="text-[#5D7D94]"> · {w.company || 'Company'}</span>
                                {w.durationYears != null && (
                                  <span className="text-[#6F91A8]"> · ~{w.durationYears}y</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeItem.parsed.education.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                            Education
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {activeItem.parsed.education.map((ed, i) => (
                              <li key={i} className="text-[11px] text-[#17324A]">
                                <span className="font-semibold">{ed.degree}</span>
                                <span className="text-[#5D7D94]"> · {ed.institution}</span>
                                {ed.year && <span className="text-[#6F91A8]"> · {ed.year}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeItem.parsed.certifications.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#5D7D94]">
                            Certifications
                          </p>
                          <ul className="mt-1.5 space-y-1">
                            {activeItem.parsed.certifications.map((c, i) => (
                              <li key={i} className="text-[11px] text-[#17324A]">
                                <span className="font-semibold">{c.name}</span>
                                {c.issuer && <span className="text-[#5D7D94]"> · {c.issuer}</span>}
                                {c.year && <span className="text-[#6F91A8]"> · {c.year}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {activeItem.parsed.skills.length === 0 &&
                        activeItem.parsed.workHistory.length === 0 &&
                        activeItem.parsed.education.length === 0 &&
                        activeItem.parsed.certifications.length === 0 && (
                          <p className="text-[11px] text-[#6F91A8]">
                            No structured skills, work history, education or certifications were detected in
                            this resume.
                          </p>
                        )}

                      <p className="border-t border-[#DCEAF4] pt-2 text-[10px] text-[#6F91A8]">
                        In-house heuristic parser — extracted fields are approximate; always verify before
                        saving.
                      </p>
                    </div>
                  )}

                  {activeItem.error && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#F2B8B5] bg-[#FDF4F4] px-3 py-2 text-[11px] text-[#A12622]">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{activeItem.error}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={skipActive}
                      disabled={activeItem.status !== 'ready'}
                      className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-2 text-xs font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Skip this resume
                    </button>
                    <button
                      type="button"
                      onClick={() => void createActive()}
                      disabled={!canCreate}
                      className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#315B76] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {activeItem.status === 'creating' ? 'Creating…' : 'Create candidate & attach resume'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#C3D9E8] px-5 py-3">
          <p className="text-[11px] text-[#5D7D94]">
            {queue.length === 0
              ? 'No resumes added yet'
              : `${counts.created} created · ${counts.skipped} skipped · ${counts.failed} failed · ${counts.pending} pending review`}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-1.5 text-xs font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA]"
            >
              Add more files
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-[#17324A] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#315B76]"
            >
              {counts.pending > 0 ? 'Close without saving pending' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
