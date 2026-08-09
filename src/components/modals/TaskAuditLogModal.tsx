'use client';

import React from 'react';
import {
  History,
  X,
  Clock,
  UserCheck,
  Briefcase,
  Crown,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  FileText,
} from 'lucide-react';
import { Task, AuditLogEntry } from '@/context/HRMSContext';

interface TaskAuditLogModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskAuditLogModal: React.FC<TaskAuditLogModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !task) return null;

  const logs = task.auditLogs || [];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ceo':
        return <Crown className="w-3.5 h-3.5 text-purple-600" />;
      case 'manager':
        return <Briefcase className="w-3.5 h-3.5 text-[#17324A]" />;
      default:
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#D9E5EE] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E5EE] flex items-center justify-between bg-[#F5F9FC]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#17324A]" />
            <div>
              <h3 className="text-sm font-bold text-[#17324A]">
                Task Audit Trail & Lifecycle History
              </h3>
              <p className="text-[11px] text-[#5F7180]">
                Task: {task.id} • {task.title}
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

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5F7180]">
              No audit logs recorded for this task.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D9E5EE]">
              {logs.map((entry, index) => (
                <div key={entry.id || index} className="relative space-y-1.5">
                  
                  {/* Dot */}
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-white border-2 border-[#17324A] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#17324A]" />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#17324A]">{entry.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#B0D0EA] text-[#17324A] font-semibold flex items-center gap-1">
                        {getRoleIcon(entry.userRole)}
                        {entry.userName}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8C9CA8] font-mono">{entry.timestamp}</span>
                  </div>

                  {entry.previousStatus && entry.previousStatus !== 'None' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[#5F7180]">
                      <span className="font-semibold">Status:</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{entry.previousStatus}</span>
                      <span>→</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#B0D0EA]/40 text-[#17324A] font-bold">{entry.newStatus}</span>
                    </div>
                  )}

                  {entry.comments && (
                    <p className="text-xs text-[#5F7180] bg-[#F5F9FC] p-2.5 rounded-xl border border-[#D9E5EE] leading-relaxed">
                      {entry.comments}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#D9E5EE] bg-[#F5F9FC] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-sm"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
};
