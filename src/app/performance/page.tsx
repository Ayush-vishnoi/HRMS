'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Filter,
  ListChecks,
  MessageSquareText,
  Target,
  UserRoundCheck,
  X,
  Plus,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';

type KraPriority = 'Critical' | 'High' | 'Medium' | 'Low';
type KraStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'Completed';

type KraItem = {
  id: string;
  title: string;
  description: string;
  keyResult: string;
  category: string;
  assignedToId: string;
  assignedTo: string;
  assignedBy: string;
  assignerRole: string;
  assignedOn: string;
  dueDate: string;
  priority: KraPriority;
  status: KraStatus;
  progress: number;
  weightage: number;
  lastUpdate: string;
  deliverables: string[];
};

const priorityOrder: Record<KraPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

const priorityStyle: Record<KraPriority, string> = {
  Critical: 'border-rose-200 bg-rose-50 text-rose-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-sky-200 bg-sky-50 text-sky-700',
};

const statusStyle: Record<KraStatus, string> = {
  'Not Started': 'border-slate-200 bg-slate-50 text-slate-600',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700',
  'Under Review': 'border-violet-200 bg-violet-50 text-violet-700',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export default function PerformancePage() {
  const { currentUser, employees } = useHRMS();
  const isManager = currentUser.userRole === 'manager';
  const isEmployee = currentUser.userRole === 'employee';

  const directReports = useMemo(
    () => employees.filter((employee) => employee.manager === currentUser.name || (employee as any).managerId === currentUser.id),
    [currentUser.name, currentUser.id, employees]
  );

  const [kras, setKras] = useState<KraItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | KraPriority>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | KraStatus>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftUpdate, setDraftUpdate] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignment, setAssignment] = useState({
    title: '',
    description: '',
    keyResult: '',
    assigneeId: '',
    dueDate: '2026-08-31',
    priority: 'Medium' as KraPriority,
  });

  const fetchKras = async () => {
    try {
      const res = await fetch(`/api/performance?employeeId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(currentUser.userRole)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setKras(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch KRAs from database:', err);
    }
  };

  useEffect(() => {
    fetchKras();
  }, [currentUser.id, currentUser.userRole]);

  const filteredKras = useMemo(
    () => kras
      .filter((kra) => priorityFilter === 'ALL' || kra.priority === priorityFilter)
      .filter((kra) => statusFilter === 'ALL' || kra.status === statusFilter)
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]),
    [kras, priorityFilter, statusFilter]
  );

  const selectedKra = kras.find((kra) => kra.id === selectedId) ?? null;
  const completedCount = kras.filter((kra) => kra.status === 'Completed').length;
  const activeCount = kras.filter((kra) => kra.status === 'In Progress').length;
  const weightedProgress = Math.round(
    kras.reduce((total, kra) => total + kra.progress * kra.weightage, 0) /
      Math.max(1, kras.reduce((total, kra) => total + kra.weightage, 0))
  );

  const openDetails = (kra: KraItem) => {
    setSelectedId(kra.id);
    setDraftProgress(kra.progress);
    setDraftUpdate(kra.lastUpdate);
    setSavedMessage('');
  };

  const assignTask = async () => {
    const assignee = directReports.find((employee) => employee.id === assignment.assigneeId);
    if (!isManager || !assignee || !assignment.title.trim() || !assignment.keyResult.trim()) return;

    const formattedAssignedOn = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    const formattedDueDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${assignment.dueDate}T00:00:00`));

    try {
      const res = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: assignment.title.trim(),
          description: assignment.description.trim() || 'Complete the assigned team deliverable.',
          keyResult: assignment.keyResult.trim(),
          category: 'Team Delivery',
          assignedToId: assignee.id,
          assignedById: currentUser.id,
          assignedOn: formattedAssignedOn,
          dueDate: formattedDueDate,
          priority: assignment.priority,
          status: 'Not Started',
          progress: 0,
          weightage: 20,
          lastUpdate: 'Task assigned by manager; waiting for team member update.',
          deliverables: ['Progress update', 'Completed work handover'],
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setKras((current) => [json.data, ...current]);
      }
    } catch (err) {
      console.error('Failed to assign KRA in database:', err);
    }

    setAssignment({ title: '', description: '', keyResult: '', assigneeId: '', dueDate: '2026-08-31', priority: 'Medium' });
    setIsAssigning(false);
  };

  const saveProgress = async () => {
    if (!selectedKra) return;

    const nextStatus: KraStatus = draftProgress === 100
      ? 'Completed'
      : draftProgress > 0
        ? 'In Progress'
        : 'Not Started';

    const statusToSave = selectedKra.status === 'Under Review' && draftProgress < 100 ? 'Under Review' : nextStatus;
    const updateNote = draftUpdate.trim() || selectedKra.lastUpdate;

    setKras((current) => current.map((kra) => (
      kra.id === selectedKra.id
        ? {
            ...kra,
            progress: draftProgress,
            status: statusToSave,
            lastUpdate: updateNote,
          }
        : kra
    )));
    setSavedMessage('Progress updated in database successfully.');

    try {
      await fetch('/api/performance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedKra.id,
          progress: draftProgress,
          status: statusToSave,
          lastUpdate: updateNote,
        }),
      });
    } catch (err) {
      console.error('Failed to update KRA in database:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#5B91B5]">
            <Target className="h-4 w-4" />
            Key Result Areas
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#17324A]">
            {isManager ? 'Team KRA & Task Assignment' : isEmployee ? 'My KRA Work Tracker' : 'Organisation KRA Overview'}
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            {isManager
              ? 'Assign measurable work to direct reports and review team delivery progress from PostgreSQL.'
              : isEmployee
                ? 'Track assigned work, update progress, and review priorities, ownership, and expected results.'
                : 'Review assigned work and delivery progress across the organisation.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isManager && (
            <button
              onClick={() => setIsAssigning(true)}
              disabled={directReports.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Assign Task
            </button>
          )}
          <div className="rounded-xl border border-[#9FC5E2] bg-[#EAF2F8] px-4 py-2 text-xs font-bold text-[#17324A]">
            Q3 2026 · Active Cycle
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall KRA Progress" value={`${weightedProgress}%`} detail="Weighted by assigned contribution" icon={Target} />
        <StatCard label="Active Work Items" value={String(activeCount)} detail="Currently in progress" icon={Clock3} />
        <StatCard label="Completed" value={`${completedCount} / ${kras.length}`} detail="Approved or delivered" icon={CheckCircle2} />
        <StatCard label="Critical Priority" value={String(kras.filter((kra) => kra.priority === 'Critical' && kra.status !== 'Completed').length)} detail="Requires immediate focus" icon={AlertTriangle} />
      </div>

      <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
              <ListChecks className="h-4 w-4" /> {isManager ? 'Team Assigned Work' : 'Assigned KRA Work'}
            </h2>
            <p className="mt-1 text-xs text-[#667085]">Work is ordered by priority, with the most important item first.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[#667085]" />
            <select
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value as 'ALL' | KraPriority)}
              className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            >
              <option value="ALL">All priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | KraStatus)}
              className="rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-xs font-semibold text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            >
              <option value="ALL">All statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredKras.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#9FC2DC] bg-[#F5F9FC] px-4 py-10 text-center text-sm text-[#667085]">
              No KRA work matches the selected filters.
            </div>
          ) : filteredKras.map((kra) => (
            <article key={kra.id} className="rounded-xl border border-[#D9E5EE] bg-[#F9FBFD] p-4 transition hover:border-[#9FC2DC] hover:shadow-sm">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${priorityStyle[kra.priority]}`}>
                      {kra.priority} Priority
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[kra.status]}`}>
                      {kra.status}
                    </span>
                    <span className="text-[10px] font-semibold text-[#667085]">{kra.id} · {kra.category}</span>
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-[#17324A]">{kra.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#667085]">{kra.keyResult}</p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-[#667085]">
                    {isManager && <span className="flex items-center gap-1.5"><UserRoundCheck className="h-3.5 w-3.5" /> Assigned to <strong className="text-[#17324A]">{kra.assignedTo}</strong></span>}
                    <span className="flex items-center gap-1.5"><UserRoundCheck className="h-3.5 w-3.5" /> Assigned by <strong className="text-[#17324A]">{kra.assignedBy}</strong></span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> Due {kra.dueDate}</span>
                    <span className="font-semibold text-[#17324A]">Weightage {kra.weightage}%</span>
                  </div>
                </div>

                <div className="w-full shrink-0 xl:w-64">
                  <div className="mb-1.5 flex justify-between text-xs font-semibold text-[#667085]">
                    <span>Progress</span><span className="font-bold text-[#17324A]">{kra.progress}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#DCEAF4]">
                    <div
                      className={`h-full rounded-full transition-all ${kra.progress === 100 ? 'bg-emerald-500' : kra.priority === 'Critical' ? 'bg-rose-500' : 'bg-[#5B91B5]'}`}
                      style={{ width: `${kra.progress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => openDetails(kra)}
                  className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#9FC5E2] bg-[#B0D0EA] px-3 py-2 text-xs font-bold text-[#17324A] transition hover:bg-[#9FC5E2]"
                >
                  {isEmployee ? 'View & Update' : 'Review Task'} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedKra && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#17324A]/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="KRA work details">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-[#D9E5EE] bg-white px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5B91B5]">{selectedKra.id} · {selectedKra.category}</p>
                <h2 className="mt-1 text-lg font-black text-[#17324A]">{selectedKra.title}</h2>
              </div>
              <button onClick={() => setSelectedId(null)} aria-label="Close KRA details" className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8] hover:text-[#17324A]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${priorityStyle[selectedKra.priority]}`}>{selectedKra.priority} Priority</span>
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle[selectedKra.status]}`}>{selectedKra.status}</span>
                <span className="rounded-full border border-[#D9E5EE] bg-[#F5F9FC] px-2.5 py-1 text-[10px] font-bold text-[#17324A]">{selectedKra.weightage}% Weightage</span>
              </div>

              <DetailBlock title="Work Description" text={selectedKra.description} />
              <DetailBlock title="Expected Key Result" text={selectedKra.keyResult} />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <InfoCard label="Assigned To" value={selectedKra.assignedTo} detail={selectedKra.assignedToId} />
                <InfoCard label="Assigned By" value={selectedKra.assignedBy} detail={selectedKra.assignerRole} />
                <InfoCard label="Assignment Date" value={selectedKra.assignedOn} detail={`Due ${selectedKra.dueDate}`} />
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-[#667085]">Required Deliverables</h3>
                <ul className="mt-2 space-y-2">
                  {selectedKra.deliverables.map((deliverable) => (
                    <li key={deliverable} className="flex items-start gap-2 rounded-lg bg-[#F5F9FC] px-3 py-2 text-xs text-[#17324A]">
                      <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#5B91B5]" /> {deliverable}
                    </li>
                  ))}
                </ul>
              </div>

              {isEmployee ? (
              <div className="rounded-xl border border-[#9FC2DC] bg-[#F5F9FC] p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><MessageSquareText className="h-4 w-4" /> Update Work Progress</h3>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#667085]">
                    <label htmlFor="kra-progress">Completion percentage</label>
                    <span className="text-base font-black text-[#17324A]">{draftProgress}%</span>
                  </div>
                  <input
                    id="kra-progress"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={draftProgress}
                    onChange={(event) => {
                      setDraftProgress(Number(event.target.value));
                      setSavedMessage('');
                    }}
                    className="mt-2 w-full accent-[#5B91B5]"
                  />
                </div>
                <label htmlFor="kra-update" className="mt-4 block text-xs font-bold text-[#17324A]">Progress update / work note</label>
                <textarea
                  id="kra-update"
                  rows={4}
                  value={draftUpdate}
                  onChange={(event) => {
                    setDraftUpdate(event.target.value);
                    setSavedMessage('');
                  }}
                  placeholder="Describe work completed, blockers, and the next action..."
                  className="mt-1 w-full resize-none rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                />
                {savedMessage && <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> {savedMessage}</p>}
                <button onClick={saveProgress} className="mt-4 w-full rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#244A68]">
                  Save Progress Update
                </button>
              </div>
              ) : (
                <div className="rounded-xl border border-[#9FC2DC] bg-[#F5F9FC] p-4">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]"><MessageSquareText className="h-4 w-4" /> Latest Team Member Update</h3>
                  <p className="mt-2 text-sm leading-6 text-[#52677A]">{selectedKra.lastUpdate}</p>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#DCEAF4]">
                    <div className="h-full rounded-full bg-[#5B91B5]" style={{ width: `${selectedKra.progress}%` }} />
                  </div>
                  <p className="mt-2 text-right text-xs font-bold text-[#17324A]">{selectedKra.progress}% complete</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isAssigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17324A]/35 p-4" role="dialog" aria-modal="true" aria-label="Assign KRA task">
          <form onSubmit={(event) => { event.preventDefault(); assignTask(); }} className="w-full max-w-xl space-y-4 rounded-2xl border border-[#D9E5EE] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#5B91B5]">Manager workspace</p><h2 className="mt-1 text-xl font-black text-[#17324A]">Assign KRA task</h2><p className="mt-1 text-xs text-[#667085]">Create a measurable task for one of your direct reports in PostgreSQL.</p></div>
              <button type="button" onClick={() => setIsAssigning(false)} aria-label="Close assignment form" className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]"><X className="h-5 w-5" /></button>
            </div>
            <label className="block text-xs font-bold text-[#17324A]">Task title<input required value={assignment.title} onChange={(event) => setAssignment({ ...assignment, title: event.target.value })} className="mt-1 w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-sm" placeholder="e.g. Deliver attendance dashboard" /></label>
            <label className="block text-xs font-bold text-[#17324A]">Assign to<select required value={assignment.assigneeId} onChange={(event) => setAssignment({ ...assignment, assigneeId: event.target.value })} className="mt-1 w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm"><option value="">Select team member</option>{directReports.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.role}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-[#17324A]">Priority<select value={assignment.priority} onChange={(event) => setAssignment({ ...assignment, priority: event.target.value as KraPriority })} className="mt-1 w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label><label className="block text-xs font-bold text-[#17324A]">Due date<input type="date" required value={assignment.dueDate} onChange={(event) => setAssignment({ ...assignment, dueDate: event.target.value })} className="mt-1 w-full rounded-lg border border-[#9FC2DC] px-3 py-2 text-sm" /></label></div>
            <label className="block text-xs font-bold text-[#17324A]">Expected key result<textarea required value={assignment.keyResult} onChange={(event) => setAssignment({ ...assignment, keyResult: event.target.value })} rows={3} className="mt-1 w-full resize-none rounded-lg border border-[#9FC2DC] px-3 py-2 text-sm" placeholder="Define the measurable outcome" /></label>
            <label className="block text-xs font-bold text-[#17324A]">Work description<textarea value={assignment.description} onChange={(event) => setAssignment({ ...assignment, description: event.target.value })} rows={2} className="mt-1 w-full resize-none rounded-lg border border-[#9FC2DC] px-3 py-2 text-sm" placeholder="Add context, dependencies, or deliverables" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAssigning(false)} className="rounded-lg border border-[#D9E5EE] px-4 py-2 text-xs font-bold text-[#52677A]">Cancel</button><button type="submit" className="rounded-lg bg-[#17324A] px-4 py-2 text-xs font-bold text-white">Assign task</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-[#D9E5EE] bg-white p-4 shadow-md">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#667085]">{label}</span>
        <span className="rounded-lg bg-[#EAF2F8] p-2 text-[#17324A]"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-black text-[#17324A]">{value}</p>
      <p className="mt-1 text-[11px] text-[#667085]">{detail}</p>
    </div>
  );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#667085]">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-[#17324A]">{text}</p>
    </div>
  );
}

function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[#D9E5EE] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#667085]">{label}</p>
      <p className="mt-1 text-xs font-bold text-[#17324A]">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-[#667085]">{detail}</p>
    </div>
  );
}
