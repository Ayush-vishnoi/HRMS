'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  LoaderCircle,
  Search,
  ShieldAlert,
  ShieldPlus,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  department: string;
  userRole: string;
  status: string;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
}

interface RoleOption {
  value: string;
  label: string;
  description: string;
}

interface AuditEntry {
  id: string;
  employeeId?: string | null;
  action: string;
  module: string;
  details: string;
  createdAt: string;
}

type Tab = 'users' | 'audit';

const ROLE_BADGE: Record<string, string> = {
  employee: 'bg-slate-100 text-slate-700',
  manager: 'bg-sky-100 text-sky-700',
  admin: 'bg-amber-100 text-amber-700',
  ceo: 'bg-indigo-100 text-indigo-700',
  super_admin: 'bg-violet-100 text-violet-700',
};

export default function AdministrationPage() {
  const { currentUser } = useHRMS();
  const isSuperAdmin = currentUser.rawRole === 'super_admin';

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadUsers = useCallback(async (searchTerm: string) => {
    const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : '';
    const res = await api.get<{ success: boolean; data: AdminUser[] }>(`/api/administration/users${query}`);
    if (res?.success) setUsers(res.data);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        const [rolesRes] = await Promise.all([
          api.get<{ success: boolean; data: RoleOption[] }>('/api/administration/roles'),
          loadUsers(''),
        ]);
        if (!cancelled && rolesRes?.success) setRoles(rolesRes.data);
      } catch {
        if (!cancelled) setError('Could not load the administration console.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, loadUsers]);

  useEffect(() => {
    if (!notice && !error) return;
    const timeout = window.setTimeout(() => {
      setNotice('');
      setError('');
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [notice, error]);

  useEffect(() => {
    if (tab !== 'audit' || !isSuperAdmin) return;
    let cancelled = false;
    api
      .get<{ success: boolean; data: AuditEntry[] }>('/api/administration/audit-logs?take=50')
      .then((res) => {
        if (!cancelled && res?.success) setAuditLogs(res.data);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the audit log.');
      });
    return () => {
      cancelled = true;
    };
  }, [tab, isSuperAdmin]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await loadUsers(search);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    if (newRole === user.userRole) return;
    setSavingId(user.id);
    setError('');
    try {
      const res = await api.patch<{ success: boolean; data: AdminUser }>(
        `/api/administration/users/${user.id}/role`,
        { userRole: newRole },
      );
      if (res?.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, userRole: res.data.userRole } : u)));
        const label = roles.find((r) => r.value === newRole)?.label ?? newRole;
        setNotice(`${user.name} is now ${label}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the role.');
    } finally {
      setSavingId(null);
    }
  };

  const roleLabel = useMemo(() => {
    const map: Record<string, string> = {};
    roles.forEach((r) => (map[r.value] = r.label));
    return map;
  }, [roles]);

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-amber-600" />
        <h1 className="text-sm font-bold text-amber-800">Super Admin access required</h1>
        <p className="mt-1 text-xs text-amber-700">This system administration console is restricted to Super Admins.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <ShieldPlus className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-bold text-[#17324A]">System Administration</h1>
          <p className="text-xs text-[#7B8B99]">Manage users, assign roles, and review the audit trail.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#E7EEF4]">
        <button
          type="button"
          onClick={() => setTab('users')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            tab === 'users' ? 'border-violet-500 text-[#17324A]' : 'border-transparent text-[#7B8B99] hover:text-[#17324A]'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Users &amp; Roles
        </button>
        <button
          type="button"
          onClick={() => setTab('audit')}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
            tab === 'audit' ? 'border-violet-500 text-[#17324A]' : 'border-transparent text-[#7B8B99] hover:text-[#17324A]'
          }`}
        >
          <History className="h-3.5 w-3.5" /> Audit Log
        </button>
      </div>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">{error}</div>}

      {tab === 'users' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8B99]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or ID…"
              className="w-full rounded-lg border border-[#D9E5EE] bg-white py-2 pl-9 pr-3 text-sm text-[#17324A] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]"
            />
          </form>

          <div className="overflow-hidden rounded-xl border border-[#D9E5EE] bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F9FC] text-[10px] font-bold uppercase tracking-wide text-[#7B8B99]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Current Role</th>
                  <th className="px-4 py-3">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF3F7]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#7B8B99]">
                      <LoaderCircle className="mx-auto h-4 w-4 animate-spin" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#7B8B99]">No users found.</td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F8FBFD]">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#17324A]">{user.name}</div>
                        <div className="text-[11px] text-[#7B8B99]">{user.email} · {user.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-[#3D4C59]">{user.department}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_BADGE[user.userRole] ?? 'bg-slate-100 text-slate-700'}`}>
                          {roleLabel[user.userRole] ?? user.userRole}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={user.userRole}
                            disabled={savingId === user.id}
                            onChange={(event) => handleRoleChange(user, event.target.value)}
                            className="rounded-lg border border-[#D9E5EE] bg-white px-2 py-1.5 text-xs text-[#17324A] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA] disabled:opacity-50"
                          >
                            {roles.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          {savingId === user.id && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#7B8B99]" />}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="overflow-hidden rounded-xl border border-[#D9E5EE] bg-white shadow-sm">
          <ul className="divide-y divide-[#EEF3F7]">
            {auditLogs.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-[#7B8B99]">No audit entries yet.</li>
            ) : (
              auditLogs.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2F8] text-[#315B76]">
                    <History className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[#3D4C59]">{entry.details}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8A9AAA]">
                      {entry.action} · {entry.module} · {new Date(entry.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
