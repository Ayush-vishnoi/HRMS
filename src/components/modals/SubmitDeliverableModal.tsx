'use client';

import React, { useState } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Clock,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useHRMS, Task } from '@/context/HRMSContext';

interface SubmitDeliverableModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SubmitDeliverableModal: React.FC<SubmitDeliverableModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { submitDeliverable } = useHRMS();

  const [notes, setNotes] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const isResubmission = task.status === 'Changes Requested';
  const latestReview = task.deliverable?.reviews[task.deliverable.reviews.length - 1];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!notes.trim()) {
      setErrorMsg('Please enter submission notes / explanation for your deliverable.');
      return;
    }

    const attachments = fileName
      ? [{ name: fileName, size: fileSize || '1.4 MB' }]
      : [{ name: `${task.title.replace(/[^a-zA-Z0-9]/g, '_')}_Deliverable.pdf`, size: '2.1 MB' }];

    const res = submitDeliverable(task.id, {
      notes: notes.trim(),
      attachments,
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Failed to submit deliverable.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setNotes('');
      setFileName('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#D9E5EE] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E5EE] flex items-center justify-between bg-[#F5F9FC]">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-[#17324A]" />
            <div>
              <h3 className="text-sm font-bold text-[#17324A]">
                {isResubmission ? 'Resubmit Task Deliverable' : 'Submit Task Deliverable'}
              </h3>
              <p className="text-[11px] text-[#5F7180]">
                Task ID: {task.id} • Due: {task.deadline}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5F7180] hover:text-[#17324A] hover:bg-[#EAF2F8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3 bg-white">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-[#17324A]">Deliverable Submitted!</h4>
            <p className="text-xs text-[#5F7180]">
              Your deliverable has been routed for review. Status updated to <strong>Under Review</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Task Info Summary */}
            <div className="p-3.5 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold text-[#17324A]">
                <span>{task.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-[#B0D0EA] text-[#17324A] text-[10px]">
                  {task.priority} Priority
                </span>
              </div>
              <p className="text-[#5F7180] text-[11px] leading-relaxed">{task.description}</p>
              <p className="text-[11px] text-[#17324A] pt-1 border-t border-[#D9E5EE]">
                <strong>Expected Deliverable:</strong> {task.expectedDeliverable}
              </p>
            </div>

            {/* Reviewer Feedback (if Changes Requested) */}
            {isResubmission && latestReview && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                  Reviewer Feedback from {latestReview.reviewedByName}:
                </span>
                <p className="text-amber-800 text-[11px] leading-relaxed italic bg-white/70 p-2 rounded-lg border border-amber-200">
                  "{latestReview.feedback}"
                </p>
              </div>
            )}

            {/* Deliverable Notes & Comments */}
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                Deliverable Notes / Comments *
              </label>
              <textarea
                rows={4}
                required
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isResubmission ? 'Explain the updates made based on the requested changes...' : 'Provide comprehensive notes, links to PRs, artifact summaries, and execution proof...'}
                className="w-full p-3 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
              />
            </div>

            {/* File Upload / Attachment */}
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                Attach Artifact / Documentation File (PDF, ZIP, DOCX, PNG)
              </label>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFileName(e.target.files[0].name);
                    const sizeInMB = (e.target.files[0].size / (1024 * 1024)).toFixed(1);
                    setFileSize(`${sizeInMB} MB`);
                  }
                }}
                className="w-full text-xs text-[#5F7180] file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-[#D9E5EE] file:text-xs file:font-semibold file:bg-[#B0D0EA] file:text-[#17324A] hover:file:bg-[#9FC5E2]"
              />
              <p className="text-[10px] text-[#5F7180] mt-1">
                Upload your deliverable documents, test reports, or verification screenshots.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#D9E5EE]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white border border-[#D9E5EE] text-xs font-semibold text-[#5F7180] hover:bg-[#F5F9FC]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {isResubmission ? 'Submit Updated Deliverable' : 'Submit for Review'}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
