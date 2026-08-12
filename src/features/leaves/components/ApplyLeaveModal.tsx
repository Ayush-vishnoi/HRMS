'use client';

import React, { useState } from 'react';
import { X, Calendar, CheckCircle } from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose }) => {
  const { addLeaveRequest, leaveBalances } = useHRMS();
  const [leaveType, setLeaveType] = useState<'Casual' | 'Sick' | 'Earned' | 'WFH'>('Casual');
  const [startDate, setStartDate] = useState<string>('2026-08-12');
  const [endDate, setEndDate] = useState<string>('2026-08-14');
  const [reason, setReason] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    addLeaveRequest({
      leaveType,
      startDate,
      endDate,
      days,
      reason: reason || 'Personal leave request',
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B3A4A]/10 border border-[#8B3A4A]/20 text-[#B86B78] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Apply for Leave</h3>
              <p className="text-[11px] text-secondary">Submit a leave request for HR approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3 bg-surface">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-foreground">Leave Request Submitted!</h4>
            <p className="text-xs text-secondary">Your request has been sent to HR for approval.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-surface">
            {/* Leave Balances Quick Cards */}
            <div className="grid grid-cols-4 gap-2 pb-2">
              <div
                onClick={() => setLeaveType('Casual')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Casual'
                    ? 'bg-[#8B3A4A]/20 border-[#8B3A4A] text-[#B86B78] ring-1 ring-[#8B3A4A]/50'
                    : 'bg-surface-elevated border-border text-secondary hover:border-secondary'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-secondary">Casual</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{leaveBalances.casual.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('Sick')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Sick'
                    ? 'bg-[#8B3A4A]/20 border-[#8B3A4A] text-[#B86B78] ring-1 ring-[#8B3A4A]/50'
                    : 'bg-surface-elevated border-border text-secondary hover:border-secondary'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-secondary">Sick</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{leaveBalances.sick.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('Earned')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Earned'
                    ? 'bg-[#8B3A4A]/20 border-[#8B3A4A] text-[#B86B78] ring-1 ring-[#8B3A4A]/50'
                    : 'bg-surface-elevated border-border text-secondary hover:border-secondary'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-secondary">Earned</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{leaveBalances.earned.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('WFH')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'WFH'
                    ? 'bg-[#8B3A4A]/20 border-[#8B3A4A] text-[#B86B78] ring-1 ring-[#8B3A4A]/50'
                    : 'bg-surface-elevated border-border text-secondary hover:border-secondary'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-secondary">WFH</div>
                <div className="text-sm font-bold text-foreground mt-0.5">{leaveBalances.wfh.remaining} Left</div>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#8B3A4A]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-secondary mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#8B3A4A]"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-secondary mb-1.5">Reason for Leave</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State brief reason..."
                rows={3}
                className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder-secondary focus:outline-none focus:ring-2 focus:ring-[#8B3A4A] resize-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-secondary hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold shadow-lg shadow-[#8B3A4A]/30 transition-all"
              >
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
