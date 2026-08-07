'use client';

import React, { useState } from 'react';
import { X, Calendar, FileText, CheckCircle } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

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
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Apply for Leave</h3>
              <p className="text-[11px] text-slate-400">Submit a leave request for manager approval</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-slate-100">Leave Request Submitted!</h4>
            <p className="text-xs text-slate-400">Your request has been routed to your manager for review.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Leave Balances Quick Cards */}
            <div className="grid grid-cols-4 gap-2 pb-2">
              <div
                onClick={() => setLeaveType('Casual')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Casual'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">Casual</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{leaveBalances.casual.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('Sick')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Sick'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">Sick</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{leaveBalances.sick.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('Earned')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'Earned'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">Earned</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{leaveBalances.earned.remaining} Left</div>
              </div>

              <div
                onClick={() => setLeaveType('WFH')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${
                  leaveType === 'WFH'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] uppercase font-bold text-slate-400">WFH</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">{leaveBalances.wfh.remaining} Left</div>
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Reason for Leave</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State brief reason..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
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
