'use client';

import React, { useState } from 'react';
import { AlertTriangle, UserPlus, X } from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import type { RecruitmentJob } from '@/features/recruitment/data/recruitment';

/* ============================================================
   Add Candidate Manually (no resume required)
   JSON POST /api/recruitment/candidates → CreateCandidateInput
   Server applies defaults (stage 'Applied', source 'Manual',
   tags ['New Applicant']) and computes a real match score from
   the skills / experience / location entered against the job.
   ============================================================ */

interface AddCandidateManualModalProps {
  jobs: RecruitmentJob[];
  defaultJobId: string;
  onClose: () => void;
  onCreated: (message: string) => void;
}

const inputCls =
  'w-full rounded-lg border border-[#C3D9E8] bg-white px-3 py-2 text-xs text-[#17324A] outline-none transition focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40';
const labelCls = 'flex flex-col gap-1 text-[11px] font-semibold text-[#315B76]';

export default function AddCandidateManualModal({
  jobs,
  defaultJobId,
  onClose,
  onCreated,
}: AddCandidateManualModalProps) {
  const [form, setForm] = useState({
    jobId: defaultJobId || jobs[0]?.id || '',
    name: '',
    email: '',
    phone: '',
    currentRole: '',
    location: '',
    experience: '',
    skills: '',
    summary: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The selected requisition drives the score: skills are matched against its
  // requirements (50%), experience against its band (25%), location (15%).
  const selectedJob = jobs.find((j) => j.id === form.jobId);

  const canSubmit =
    !!form.jobId && form.name.trim().length > 0 && form.email.trim().length > 0 && !isSubmitting;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const json = await authFetch<{ success: boolean; error?: string }>(
        '/api/recruitment/candidates',
        {
          method: 'POST',
          body: {
            jobId: form.jobId,
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            currentRole: form.currentRole.trim() || undefined,
            location: form.location.trim() || undefined,
            experience: form.experience.trim() || undefined,
            experienceYears: form.experience.trim() || undefined,
            skills: form.skills.trim() || undefined,
            summary: form.summary.trim() || undefined,
          },
        },
      );
      if (!json?.success) {
        setError(json?.error || 'Failed to create candidate.');
        return;
      }
      onCreated(`Candidate "${form.name.trim()}" added manually.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Network error while creating candidate.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/30 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#9FC2DC] bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#315B76]" />
              <h2 className="text-sm font-bold text-[#17324A]">Add candidate manually</h2>
            </div>
            <p className="mt-1 text-xs text-[#5D7D94]">
              Create a candidate record directly — no resume file required.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#5D7D94] transition-colors hover:bg-[#E8F2FA]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`${labelCls} sm:col-span-2`}>
              <span>Requisition *</span>
              <select
                className={inputCls}
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
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
              <span>Full name *</span>
              <input
                className={inputCls}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Candidate name"
              />
            </label>

            <label className={labelCls}>
              <span>Email *</span>
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@example.com"
              />
            </label>

            <label className={labelCls}>
              <span>Phone</span>
              <input
                className={inputCls}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+91 …"
              />
            </label>

            <label className={labelCls}>
              <span>Current role</span>
              <input
                className={inputCls}
                value={form.currentRole}
                onChange={(e) => setForm((f) => ({ ...f, currentRole: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
              />
            </label>

            <label className={labelCls}>
              <span>Location</span>
              <input
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Bengaluru, India"
              />
            </label>

            <label className={labelCls}>
              <span>Experience (years)</span>
              <input
                className={inputCls}
                type="number"
                min={0}
                step={0.5}
                value={form.experience}
                onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                placeholder="e.g. 6"
              />
              {selectedJob && (selectedJob.experienceMin != null || selectedJob.experienceMax != null) && (
                <span className="text-[10px] font-normal text-[#5D7D94]">
                  Role expects{' '}
                  {selectedJob.experienceMin ?? 0}
                  {selectedJob.experienceMax != null ? `–${selectedJob.experienceMax}` : '+'} yrs
                </span>
              )}
            </label>

            <label className={`${labelCls} sm:col-span-2`}>
              <span>Skills</span>
              <textarea
                className={`${inputCls} min-h-[54px] resize-y`}
                value={form.skills}
                onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                placeholder="Comma-separated, e.g. React, TypeScript, Node.js"
              />
              {selectedJob && selectedJob.requirements?.length > 0 && (
                <span className="flex flex-wrap items-center gap-1 text-[10px] font-normal text-[#5D7D94]">
                  Required for this role:
                  {selectedJob.requirements.map((req) => (
                    <button
                      key={req}
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          const list = f.skills
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (list.some((s) => s.toLowerCase() === req.toLowerCase())) return f;
                          return { ...f, skills: [...list, req].join(', ') };
                        })
                      }
                      className="rounded-full border border-[#B0D0EA] bg-[#EAF2F8] px-2 py-0.5 text-[10px] font-semibold text-[#315B76] transition hover:bg-[#DCEAF4]"
                    >
                      + {req}
                    </button>
                  ))}
                </span>
              )}
            </label>

            <label className={`${labelCls} sm:col-span-2`}>
              <span>Summary</span>
              <textarea
                className={`${inputCls} min-h-[70px] resize-y`}
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="Short professional summary"
              />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-[#B0D0EA] bg-[#F4F9FC] px-3 py-2 text-[10px] text-[#315B76]">
            <span>
              <span className="font-semibold">How the fit score is computed:</span> Skills matched
              against the role requirements (50%), experience vs the role band (25%), location (15%),
              education baseline (10%). Fill these for an accurate score instead of a default.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-[#F2B8B5] bg-[#FDF4F4] px-3 py-2 text-[11px] text-[#A12622]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#9FC2DC] bg-[#F4F9FC] px-3.5 py-2 text-xs font-semibold text-[#17324A] transition-colors hover:bg-[#E8F2FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-[#17324A] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#315B76] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {isSubmitting ? 'Adding…' : 'Add candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
