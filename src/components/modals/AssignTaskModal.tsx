'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  UserCheck,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';
import { Employee } from '@/data/mockData';
import { getAccessibleAssignees } from '@/utils/taskAuthorization';

export interface AssignTaskModalProps {
  employee?: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

const KRA_CATEGORIES = [
  'Product Engineering & ML Platform',
  'System Reliability & Compliance',
  'Design System & Accessibility',
  'Talent Acquisition & Velocity',
  'Operations & Governance',
];

export const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  employee,
  isOpen,
  onClose,
}) => {
  const { currentUser, employees, createTask } = useHRMS();

  const accessibleAssignees = getAccessibleAssignees(currentUser, employees);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    employee?.id || (accessibleAssignees[0]?.id ?? '')
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [deadline, setDeadline] = useState('2026-08-25');
  const [expectedDeliverable, setExpectedDeliverable] = useState('');
  const [kraCategory, setKraCategory] = useState(KRA_CATEGORIES[0]);
  const [ceoApprovalRequired, setCeoApprovalRequired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setSelectedEmployeeId(employee.id);
    } else if (accessibleAssignees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(accessibleAssignees[0].id);
    }
  }, [employee, accessibleAssignees, selectedEmployeeId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please enter a task title.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Please enter a detailed task description.');
      return;
    }
    if (!expectedDeliverable.trim()) {
      setErrorMsg('Please specify the expected deliverable.');
      return;
    }
    if (!selectedEmployeeId) {
      setErrorMsg('Please select an assignee.');
      return;
    }

    const res = createTask({
      title: title.trim(),
      description: description.trim(),
      priority,
      deadline,
      expectedDeliverable: expectedDeliverable.trim(),
      assignedTo: selectedEmployeeId,
      kraCategory,
      ceoApprovalRequired,
    });

    if (!res.success) {
      setErrorMsg(res.message || 'Failed to assign task.');
      return;
    }

    // Reset & close
    setTitle('');
    setDescription('');
    setExpectedDeliverable('');
    setCeoApprovalRequired(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#D9E5EE] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#D9E5EE] flex items-center justify-between bg-[#F5F9FC]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#17324A]" />
            <div>
              <h3 className="text-sm font-bold text-[#17324A]">
                Assign New Task & Deliverable
              </h3>
              <p className="text-[11px] text-[#5F7180]">
                Assignee scope: {currentUser.userRole === 'ceo' || currentUser.userRole === 'admin' ? 'Organization-wide' : currentUser.userRole === 'manager' ? `${currentUser.department} Department` : 'Direct Reports'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Assignee Selector */}
          <div>
            <label className="block text-xs font-bold text-[#17324A] mb-1">
              Assign To *
            </label>
            {accessibleAssignees.length === 0 ? (
              <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                You do not have any lower-hierarchy members available to assign tasks.
              </p>
            ) : (
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] font-semibold focus:outline-none focus:border-[#17324A]"
              >
                {accessibleAssignees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role} • {emp.department})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-bold text-[#17324A] mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement Real-Time Telemetry Pipeline"
              className="w-full px-3.5 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
            />
          </div>

          {/* KRA Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                KRA Category
              </label>
              <select
                value={kraCategory}
                onChange={(e) => setKraCategory(e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
              >
                {KRA_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#17324A] mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                className="w-full px-3 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
              >
                <option value="High">🔴 High Priority</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-bold text-[#17324A] mb-1">
              Target Deadline *
            </label>
            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] font-mono focus:outline-none focus:border-[#17324A]"
            />
          </div>

          {/* Expected Deliverable */}
          <div>
            <label className="block text-xs font-bold text-[#17324A] mb-1">
              Expected Deliverable Artifact *
            </label>
            <input
              type="text"
              required
              value={expectedDeliverable}
              onChange={(e) => setExpectedDeliverable(e.target.value)}
              placeholder="e.g. PR link, test summary PDF, and staging environment verification"
              className="w-full px-3.5 py-2 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[#17324A] mb-1">
              Task Description & Objectives *
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide comprehensive details, acceptance criteria, and reference links..."
              className="w-full p-3 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] focus:outline-none focus:border-[#17324A]"
            />
          </div>

          {/* CEO Approval Required Checkbox */}
          <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-2.5">
            <input
              id="ceoApprovalCheckbox"
              type="checkbox"
              checked={ceoApprovalRequired}
              onChange={(e) => setCeoApprovalRequired(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="ceoApprovalCheckbox" className="text-xs text-purple-950 cursor-pointer">
              <span className="font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-purple-700" />
                CEO Approval Required
              </span>
              <span className="text-[11px] text-purple-800 block mt-0.5">
                Enable for high-impact deliverables. Final approval will route to the CEO before task closure.
              </span>
            </label>
          </div>

          {/* Buttons */}
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
              disabled={accessibleAssignees.length === 0}
              className="px-5 py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Assign Deliverable
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
