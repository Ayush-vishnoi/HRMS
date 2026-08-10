'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Headset, Send, X } from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

type TicketCategory = 'Attendance' | 'Leave' | 'Payroll' | 'Documents' | 'Policy' | 'Other';
type TicketPriority = 'Low' | 'Medium' | 'High';

interface HRHelpDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HRHelpDeskModal: React.FC<HRHelpDeskModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, helpDeskTickets, submitHelpDeskTicket } = useHRMS();
  const [category, setCategory] = useState<TicketCategory>('Attendance');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [ticketId, setTicketId] = useState('');

  if (!isOpen || typeof document === 'undefined') return null;

  const resetAndClose = () => {
    setTicketId('');
    setCategory('Attendance');
    setPriority('Medium');
    setSubject('');
    setDescription('');
    onClose();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const createdTicketId = submitHelpDeskTicket({ category, priority, subject: subject.trim(), description: description.trim() });
    setTicketId(createdTicketId);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex min-h-dvh items-center justify-center overflow-y-auto bg-[#17324A]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="hr-help-desk-title">
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#D9E5EE] bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D9E5EE] bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCEAF4] text-[#17324A]">
              <Headset className="h-4.5 w-4.5" />
            </span>
            <div>
              <h2 id="hr-help-desk-title" className="text-sm font-bold text-[#17324A]">Ask HR Help Desk</h2>
              <p className="text-[11px] text-[#667085]">Raise a support ticket for an HR-related problem</p>
            </div>
          </div>
          <button type="button" onClick={resetAndClose} aria-label="Close HR help desk" className="rounded-lg p-1.5 text-[#667085] transition-colors hover:bg-[#F1F5F9] hover:text-[#17324A]">
            <X className="h-4 w-4" />
          </button>
        </header>

        {ticketId ? (
          <div className="space-y-4 px-6 py-9 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-[#17324A]">Ticket raised successfully</h3>
              <p className="mt-1 text-xs text-[#667085]">HR will review your issue and share updates through Ask HR.</p>
            </div>
            <div className="mx-auto max-w-xs rounded-xl border border-[#9FC2DC] bg-[#F4F9FC] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#667085]">Ticket number</p>
              <p className="mt-1 font-mono text-sm font-bold text-[#17324A]">{ticketId}</p>
            </div>
            <button type="button" onClick={resetAndClose} className="rounded-xl bg-[#17324A] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#234B68]">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <div className="rounded-xl border border-[#D9E5EE] bg-[#F7FAFC] px-4 py-3 text-xs">
              <p className="font-semibold text-[#17324A]">{currentUser.name}</p>
              <p className="mt-0.5 text-[11px] text-[#667085]">{currentUser.employeeCode} · {currentUser.department}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
                Issue category
                <select value={category} onChange={(event) => setCategory(event.target.value as TicketCategory)} className="w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40">
                  <option>Attendance</option>
                  <option>Leave</option>
                  <option>Payroll</option>
                  <option>Documents</option>
                  <option>Policy</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold text-[#17324A]">
                Priority
                <select value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority)} className="w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </div>

            <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
              Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Briefly describe your issue" maxLength={100} required className="w-full rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40" />
            </label>

            <label className="block space-y-1.5 text-xs font-semibold text-[#17324A]">
              Problem details
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain the problem and include any useful details for HR..." rows={5} minLength={10} maxLength={1000} required className="w-full resize-none rounded-xl border border-[#D9E5EE] bg-white px-3 py-2.5 text-xs font-normal text-[#17324A] outline-none placeholder:text-[#98A2B3] focus:border-[#6FA6C9] focus:ring-2 focus:ring-[#B0D0EA]/40" />
              <span className="block text-right text-[10px] font-normal text-[#98A2B3]">{description.length}/1000</span>
            </label>

            {helpDeskTickets.filter((ticket) => ticket.employeeId === currentUser.id && ticket.category !== 'Grievance / Complaint').length > 0 && (
              <div className="border-t border-[#E4EBF1] pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#315B76]">Your recent tickets</p>
                  <span className="text-[10px] text-[#98A2B3]">HR updates</span>
                </div>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {helpDeskTickets.filter((ticket) => ticket.employeeId === currentUser.id && ticket.category !== 'Grievance / Complaint').map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border border-[#D9E5EE] bg-[#F9FBFD] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[11px] font-semibold text-[#17324A]">{ticket.subject}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{ticket.status}</span>
                      </div>
                      {ticket.resolution && <p className="mt-1 text-[10px] leading-4 text-emerald-700">HR: {ticket.resolution}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-[#E4EBF1] pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={resetAndClose} className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#52677A] transition-colors hover:bg-[#F1F5F9]">Cancel</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#234B68]">
                <Send className="h-3.5 w-3.5" />
                Raise ticket
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
