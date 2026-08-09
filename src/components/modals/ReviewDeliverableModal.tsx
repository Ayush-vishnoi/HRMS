'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  FileText,
  AlertCircle,
  Download,
  Crown,
  MessageSquare,
} from 'lucide-react';
import { useHRMS, Task } from '@/context/HRMSContext';
import { canApproveDeliverable } from '@/utils/taskAuthorization';

interface ReviewDeliverableModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewDeliverableModal: React.FC<ReviewDeliverableModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { currentUser, employees, reviewDeliverable } = useHRMS();

  const [action, setAction] = useState<'Approved' | 'Rejected' | 'Changes Requested'>('Approved');
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const canApprove = canApproveDeliverable(currentUser, task, employees);
  const deliverable = task.deliverable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!feedback.trim()) {
      setErrorMsg('Please enter feedback / review comments for the employee.');
      return;
    }

    if (action === 'Approved' && !canApprove) {
      setErrorMsg('CEO Approval Required: This task requires mandatory sign-off from the CEO before final approval.');
      return;
    }

    const res = reviewDeliverable(task.id, {
      action,
      feedback: feedback.trim(),
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Failed to submit review.');
      return;
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setFeedback('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#D9E5EE] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E5EE] flex items-center justify-between bg-[#F5F9FC]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#17324A]" />
            <div>
              <h3 className="text-sm font-bold text-[#17324A]">
                Review Employee Deliverable
              </h3>
              <p className="text-[11px] text-[#5F7180]">
                Task: {task.id} • Assignee: {task.assignedToName}
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
            <h4 className="text-base font-bold text-[#17324A]">Review Recorded!</h4>
            <p className="text-xs text-[#5F7180]">
              Decision and feedback have been logged and the employee has been notified.
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

            {/* CEO Approval Notice */}
            {task.ceoApprovalRequired && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs flex items-center gap-2 text-purple-900 font-semibold">
                <Crown className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  {currentUser.userRole === 'ceo'
                    ? 'You are reviewing this as the CEO. Your approval will mark the task completed.'
                    : 'This task requires CEO Final Approval. You can Request Changes or recommend review.'}
                </span>
              </div>
            )}

            {/* Submitted Deliverable Info */}
            <div className="p-4 rounded-xl bg-[#F5F9FC] border border-[#D9E5EE] space-y-2.5 text-xs">
              <div className="flex items-center justify-between font-bold text-[#17324A]">
                <span>{task.title}</span>
                <span className="text-[10px] text-[#5F7180]">Submitted by {deliverable?.submittedByName || task.assignedToName}</span>
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#17324A] block mb-0.5">
                  Submission Notes:
                </span>
                <p className="text-[11px] text-[#5F7180] leading-relaxed bg-white p-2.5 rounded-lg border border-[#D9E5EE]">
                  {deliverable?.notes || 'No submission notes provided.'}
                </p>
              </div>

              {deliverable?.attachments && deliverable.attachments.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-[#17324A] block mb-1">
                    Submitted Artifacts:
                  </span>
                  <div className="space-y-1">
                    {deliverable.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9E5EE] text-[11px]">
                        <span className="font-semibold text-[#17324A] flex items-center gap-1.5 truncate">
                          <FileText className="w-3.5 h-3.5 text-[#17324A]" />
                          {att.name} ({att.size})
                        </span>
                        <button
                          type="button"
                          onClick={() => alert(`Downloading artifact: ${att.name}`)}
                          className="px-2 py-0.5 rounded bg-[#B0D0EA] text-[#17324A] text-[10px] font-bold hover:bg-[#9FC5E2]"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Decision Selector */}
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1.5">
                Review Decision *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAction('Approved')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    action === 'Approved'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'bg-white border-[#D9E5EE] text-[#5F7180] hover:bg-[#F5F9FC]'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Approve</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('Changes Requested')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    action === 'Changes Requested'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm'
                      : 'bg-white border-[#D9E5EE] text-[#5F7180] hover:bg-[#F5F9FC]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Request Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction('Rejected')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    action === 'Rejected'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                      : 'bg-white border-[#D9E5EE] text-[#5F7180] hover:bg-[#F5F9FC]'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Review Feedback */}
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                Feedback & Review Notes *
              </label>
              <textarea
                rows={3}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Specify feedback, corrections needed, or sign-off approval notes..."
                className="w-full p-3 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
              />
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
                <ShieldCheck className="w-3.5 h-3.5" />
                Submit Review Decision
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
