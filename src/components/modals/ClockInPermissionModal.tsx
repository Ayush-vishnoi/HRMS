'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, X } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

interface ClockInPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClockInPermissionModal: React.FC<ClockInPermissionModalProps> = ({ isOpen, onClose }) => {
  const { submitLateClockInRequest } = useHRMS();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setReason('');
    setError('');
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = submitLateClockInRequest(reason);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError('');
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#17324A]/45 px-4" role="dialog" aria-modal="true" aria-labelledby="late-clock-in-title">
      <div className="w-full max-w-md rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600"><Clock3 className="h-5 w-5" /></div>
            <div>
              <h2 id="late-clock-in-title" className="text-base font-bold text-[#17324A]">HR permission required</h2>
              <p className="mt-1 text-xs leading-5 text-[#667085]">Attendance clock-in is available from 8:00 AM–6:00 PM. Clock in from 8:00 AM–10:00 AM without approval; Employee and Manager late clock-ins after 10:00 AM require HR approval.</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1 text-[#667085] hover:bg-[#F5F9FC]" aria-label="Close permission dialog"><X className="h-4 w-4" /></button>
        </div>

        {submitted ? (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Request sent to HR</div>
            <p className="mt-2 text-xs leading-5">Your request is pending approval. You can clock in once HR approves it.</p>
            <button type="button" onClick={handleClose} className="mt-4 rounded-lg bg-[#2d577b] px-4 py-2 text-xs font-bold text-white">Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-xs font-semibold text-[#17324A]" htmlFor="late-clock-in-reason">
              Reason <span className="text-rose-600">*</span>
              <textarea id="late-clock-in-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} required placeholder="Enter the reason for your late arrival" className="mt-2 w-full resize-none rounded-xl border border-[#D9E5EE] px-3 py-2.5 text-sm font-normal text-[#17324A] outline-none focus:border-[#6FA6C9]" />
            </label>
            {error && <p className="flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={handleClose} className="rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-semibold text-[#667085]">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#2d577b] px-4 py-2 text-xs font-bold text-white hover:bg-[#316286]">Send HR Request</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
