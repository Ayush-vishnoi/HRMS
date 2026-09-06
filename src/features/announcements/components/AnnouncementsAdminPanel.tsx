'use client';

import { authFetch } from '@/lib/api-client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Megaphone,
  Pencil,
  Pin,
  PinOff,
  PlusCircle,
  Trash2,
  X,
} from 'lucide-react';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CATEGORIES,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementCategory,
  announcementStatus,
  audienceLabel,
  fetchAnnouncements,
  formatAnnouncementDate,
} from '@/features/announcements/data/announcements';

const inputClass =
  'w-full rounded-lg border border-[#9FC2DC] bg-white px-3 py-2 text-sm text-[#17324A] outline-none focus:ring-2 focus:ring-[#B0D0EA]';

const statusToneClass: Record<string, string> = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-500',
  archived: 'border-slate-300 bg-slate-100 text-slate-600',
  scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
};

interface AnnouncementFormState {
  title: string;
  body: string;
  category: AnnouncementCategory;
  postedByDepartment: string;
  isPinned: boolean;
  expiresAt: string; // yyyy-mm-dd from <input type="date">, '' = never
  targetAudience: AnnouncementAudience;
  targetDepartment: string;
  targetLocation: string;
  targetRole: string;
}

const emptyForm = (department: string): AnnouncementFormState => ({
  title: '',
  body: '',
  category: 'General',
  postedByDepartment: department,
  isPinned: false,
  expiresAt: '',
  targetAudience: 'All',
  targetDepartment: '',
  targetLocation: '',
  targetRole: 'employee',
});

/** Convert an ISO expiresAt to a yyyy-mm-dd value for <input type="date">. */
const isoToDateInput = (iso: string | null): string =>
  iso ? new Date(iso).toISOString().slice(0, 10) : '';

export function AnnouncementsAdminPanel({
  currentUserDepartment,
}: {
  currentUserDepartment: string;
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(emptyForm(currentUserDepartment));
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await fetchAnnouncements('admin');
      setAnnouncements(data);
      setError('');
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Failed to load announcements.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load announcements + distinct departments/locations (from employee directory) for targeting dropdowns
  useEffect(() => {
    loadAnnouncements();
    authFetch<Response>('/api/employees', { raw: true })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { success?: boolean; data?: Array<{ department: string; location: string }> } | null) => {
        if (json?.success && Array.isArray(json.data)) {
          setDepartments([...new Set(json.data.map((e) => e.department))].sort());
          setLocations([...new Set(json.data.map((e) => e.location))].sort());
        }
      })
      .catch((err) => console.error('Failed to load employee directory for targeting options:', err));
  }, [loadAnnouncements]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(currentUserDepartment));
    setShowForm(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditing(announcement);
    setForm({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      postedByDepartment: announcement.postedByDepartment,
      isPinned: announcement.isPinned,
      expiresAt: isoToDateInput(announcement.expiresAt),
      targetAudience: announcement.targetAudience,
      targetDepartment: announcement.targetDepartment ?? '',
      targetLocation: announcement.targetLocation ?? '',
      targetRole: announcement.targetRole ?? 'employee',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const saveAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      postedByDepartment: form.postedByDepartment.trim() || currentUserDepartment,
      isPinned: form.isPinned,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
      targetAudience: form.targetAudience,
      targetDepartment: form.targetAudience === 'Department' ? form.targetDepartment : null,
      targetLocation: form.targetAudience === 'Location' ? form.targetLocation : null,
      targetRole: form.targetAudience === 'Role' ? form.targetRole : null,
    };
    if (editing) payload.id = editing.id;

    try {
      const res = await authFetch<Response>('/api/announcements', { raw: true,
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to save announcement.');
        return;
      }
      setNotice(editing ? 'Announcement updated successfully.' : 'Announcement published and employees notified.');
      closeForm();
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to save announcement:', err);
      setError('Failed to save announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const quickAction = async (id: string, action: 'pin' | 'unpin' | 'archive' | 'unarchive') => {
    setError('');
    try {
      const res = await authFetch<Response>('/api/announcements', { raw: true,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Action failed.');
        return;
      }
      setAnnouncements((current) =>
        current.map((a) => (a.id === id ? (json.data as Announcement) : a)),
      );
      setNotice(
        action === 'pin' ? 'Announcement pinned to top.' :
        action === 'unpin' ? 'Announcement unpinned.' :
        action === 'archive' ? 'Announcement archived — hidden from employees.' :
        'Announcement restored.',
      );
    } catch (err) {
      console.error('Announcement quick action failed:', err);
      setError('Action failed.');
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!window.confirm(`Delete announcement "${announcement.title}"? This cannot be undone.`)) return;
    setError('');
    try {
      const res = await authFetch<Response>(`/api/announcements?id=${encodeURIComponent(announcement.id)}`, { raw: true,
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Delete failed.');
        return;
      }
      setAnnouncements((current) => current.filter((a) => a.id !== announcement.id));
      setNotice('Announcement deleted.');
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      setError('Delete failed.');
    }
  };

  const stats = useMemo(
    () => ({
      active: announcements.filter((a) => announcementStatus(a).tone === 'active').length,
      pinned: announcements.filter((a) => a.isPinned).length,
      archived: announcements.filter((a) => a.isArchived).length,
    }),
    [announcements],
  );

  return (
    <section className="rounded-2xl border border-[#D9E5EE] bg-white p-5 shadow-md">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
            <Megaphone className="h-4 w-4 text-amber-500" /> Company announcements
          </h2>
          <p className="mt-1 text-xs text-[#667085]">
            Publish targeted announcements to the employee dashboard. {stats.active} active · {stats.pinned} pinned · {stats.archived} archived
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68]"
        >
          <PlusCircle className="h-4 w-4" /> New announcement
        </button>
      </div>

      {notice && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#D9E5EE] bg-[#EAF2F8] text-[#667085]">
              <th className="px-4 py-3">Announcement</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D9E5EE]">
            {announcements.map((announcement) => {
              const status = announcementStatus(announcement);
              return (
                <tr key={announcement.id} className={`hover:bg-[#F5F9FC] ${announcement.isArchived ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#17324A]">
                      {announcement.isPinned && <Pin className="mr-1 inline h-3 w-3 text-amber-500" />}
                      {announcement.title}
                    </p>
                    <p className="mt-1 text-[10px] font-normal text-[#667085]">
                      {announcement.id} · by {announcement.postedByDepartment}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[#667085]">{announcement.category}</td>
                  <td className="px-4 py-3 text-[#667085]">{audienceLabel(announcement)}</td>
                  <td className="px-4 py-3 text-[#667085]">{formatAnnouncementDate(announcement.publishedAt)}</td>
                  <td className="px-4 py-3 text-[#667085]">
                    {announcement.expiresAt ? formatAnnouncementDate(announcement.expiresAt) : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusToneClass[status.tone]}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => quickAction(announcement.id, announcement.isPinned ? 'unpin' : 'pin')}
                        title={announcement.isPinned ? 'Unpin announcement' : 'Pin to top'}
                        className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] p-1.5 text-[#17324A] hover:bg-[#B0D0EA]"
                      >
                        {announcement.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(announcement)}
                        title="Edit announcement"
                        className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] p-1.5 text-[#17324A] hover:bg-[#B0D0EA]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => quickAction(announcement.id, announcement.isArchived ? 'unarchive' : 'archive')}
                        title={announcement.isArchived ? 'Restore announcement' : 'Archive announcement'}
                        className="rounded-lg border border-[#9FC2DC] bg-[#EAF2F8] p-1.5 text-[#17324A] hover:bg-[#B0D0EA]"
                      >
                        {announcement.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteAnnouncement(announcement)}
                        title="Delete announcement"
                        className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading && <p className="py-8 text-center text-xs text-[#667085]">Loading announcements…</p>}
        {!isLoading && announcements.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-xs text-[#667085]">
            <Megaphone className="h-5 w-5" />
            No announcements yet. Publish the first one to reach employees.
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17324A]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? 'Edit announcement' : 'New announcement'}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#17324A]">{editing ? 'Edit announcement' : 'New announcement'}</h2>
              <button onClick={closeForm} aria-label="Close announcement form" className="rounded-lg p-2 text-[#667085] hover:bg-[#EAF2F8]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveAnnouncement} className="space-y-4">
              <label className="block text-xs font-bold text-[#17324A]">
                Title
                <input
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Independence Day Celebration 2026"
                  className={`mt-1 ${inputClass}`}
                />
              </label>

              <label className="block text-xs font-bold text-[#17324A]">
                Message
                <textarea
                  required
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="What should employees know?"
                  className={`mt-1 ${inputClass} resize-none`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-[#17324A]">
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AnnouncementCategory }))}
                    className={`mt-1 ${inputClass}`}
                  >
                    {ANNOUNCEMENT_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-bold text-[#17324A]">
                  Posted by department
                  <input
                    value={form.postedByDepartment}
                    onChange={(e) => setForm((f) => ({ ...f, postedByDepartment: e.target.value }))}
                    placeholder="e.g. People & Culture"
                    className={`mt-1 ${inputClass}`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-[#17324A]">
                  Target audience
                  <select
                    value={form.targetAudience}
                    onChange={(e) => setForm((f) => ({ ...f, targetAudience: e.target.value as AnnouncementAudience }))}
                    className={`mt-1 ${inputClass}`}
                  >
                    {ANNOUNCEMENT_AUDIENCES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                {form.targetAudience === 'Department' && (
                  <label className="block text-xs font-bold text-[#17324A]">
                    Department
                    <input
                      required
                      list="announcement-departments"
                      value={form.targetDepartment}
                      onChange={(e) => setForm((f) => ({ ...f, targetDepartment: e.target.value }))}
                      placeholder="e.g. Engineering"
                      className={`mt-1 ${inputClass}`}
                    />
                    <datalist id="announcement-departments">
                      {departments.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </label>
                )}
                {form.targetAudience === 'Location' && (
                  <label className="block text-xs font-bold text-[#17324A]">
                    Location
                    <input
                      required
                      list="announcement-locations"
                      value={form.targetLocation}
                      onChange={(e) => setForm((f) => ({ ...f, targetLocation: e.target.value }))}
                      placeholder="e.g. Bengaluru HQ"
                      className={`mt-1 ${inputClass}`}
                    />
                    <datalist id="announcement-locations">
                      {locations.map((l) => <option key={l} value={l} />)}
                    </datalist>
                  </label>
                )}
                {form.targetAudience === 'Role' && (
                  <label className="block text-xs font-bold text-[#17324A]">
                    Role
                    <select
                      value={form.targetRole}
                      onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
                      className={`mt-1 ${inputClass}`}
                    >
                      <option value="employee">employee</option>
                      <option value="manager">manager</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                )}
              </div>

              <label className="block text-xs font-bold text-[#17324A]">
                Expires on (optional)
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                  className={`mt-1 ${inputClass}`}
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-bold text-[#17324A]">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  className="h-4 w-4 rounded border-[#9FC2DC]"
                />
                Pin to top of employee dashboard
              </label>

              <p className="text-[11px] text-[#667085]">
                {editing
                  ? 'Saving updates the announcement for all targeted employees.'
                  : 'Publishing notifies all matching employees and shows the announcement on their dashboard.'}
              </p>

              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#244A68] disabled:opacity-50"
              >
                <Megaphone className="h-4 w-4" />
                {isSaving ? 'Saving…' : editing ? 'Save changes' : 'Publish announcement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
