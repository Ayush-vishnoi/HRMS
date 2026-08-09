'use client';

import React, { useState } from 'react';
import { X, Clock, AlertTriangle, CheckCircle2, Send, ShieldAlert } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

interface LateClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LateClockInModal: React.FC<LateClockInModalProps> = ({ isOpen, onClose }) => {
  const { requestLateClockIn, currentUser } = useHRMS();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory reason is required for late clock-in permission after 10:00 AM.');
      return;
    }

    requestLateClockIn(reason.trim());
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setReason('');
      setError('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white border border-[#D9E5EE] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E5EE] flex items-center justify-between bg-[#F5F9FC]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17324A]">Late Clock-In Notice</h3>
              <p className="text-[11px] text-[#5F7180]">Shift Window: 09:00 AM - 10:00 AM</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F7180] hover:text-[#17324A] hover:bg-[#EAF2F8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3 bg-white">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-base font-bold text-[#17324A]">Permission Request Sent!</h4>
            <p className="text-xs text-[#5F7180]">
              Your late clock-in request with mandatory reason has been submitted to your manager for approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
            
            {/* Alert Banner */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Clock-in Restricted After 10:00 AM</span>
              </div>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Standard shift check-in is permitted only between <strong>09:00 AM and 10:00 AM</strong>. Because you are attempting to clock in outside this window, you must make a request to your manager with a mandatory reason.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mandatory Reason */}
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                Mandatory Reason for Late Clock-In *
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Specify mandatory reason (e.g. Transit delay, client call, medical emergency)..."
                className="w-full p-3 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] placeholder:text-[#8C9CA8] focus:outline-none focus:border-[#17324A] focus:ring-1 focus:ring-[#B0D0EA] transition-all"
              />
            </div>

            {/* Employee Info preview */}
            <div className="flex items-center justify-between text-[11px] text-[#5F7180] px-1">
              <span>Employee: <strong>{currentUser.name}</strong></span>
              <span>Manager: <strong>Arjun Mehta</strong></span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white border border-[#D9E5EE] hover:bg-[#F5F9FC] text-[#5F7180] text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Make Request to Manager
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
