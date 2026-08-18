'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Clock3,
  FileText,
  Headset,
  IdCard,
  Laptop,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { HRHelpDeskModal } from '@/features/help-desk/components/HRHelpDeskModal';
import { MOCK_EMPLOYEES } from '@/features/employees/data/employees';
import { getTimeGreeting } from '@/shared/lib/formatters';

interface HeaderProps {
  onClockAction: () => void;
}

interface AssignedAssetNotification {
  id: string;
  assetTag: string;
  brand: string;
  name: string;
  lastChecked: string | null;
  serialNumber: string | null;
}

export const Header: React.FC<HeaderProps> = ({ onClockAction }) => {
  const {
    currentUser,
    isClockedIn,
    clockInTime,
    lateClockInRequest,
    leaveRequests,
    helpDeskTickets,
    logout,
  } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [greeting, setGreeting] = useState('Good Morning');
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const employeeProfile = MOCK_EMPLOYEES.find((employee) => employee.id === currentUser.id);
  const roleLabel = currentUser.userRole === 'admin'
    ? 'HR Admin'
    : currentUser.userRole === 'manager'
      ? 'Manager'
      : 'Employee';
  const profileLinks = currentUser.userRole === 'manager'
    ? [
        { label: 'My Team', href: '/my-team', icon: UsersRound },
        { label: 'Attendance', href: '/attendance', icon: Clock3 },
        { label: 'Documents', href: '/documents', icon: FileText },
      ]
    : currentUser.userRole === 'admin'
      ? [
          { label: 'Employee Directory', href: '/employees', icon: UsersRound },
          { label: 'Attendance', href: '/attendance', icon: Clock3 },
          { label: 'Documents', href: '/documents', icon: FileText },
        ]
      : [
          { label: 'Attendance', href: '/attendance', icon: Clock3 },
          { label: 'Leave Management', href: '/leaves', icon: CalendarDays },
          { label: 'Documents', href: '/documents', icon: FileText },
        ];

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getTimeGreeting());
      setIsGreetingReady(true);
    };

    updateGreeting();
    const intervalId = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);
  const [isHelpDeskOpen, setIsHelpDeskOpen] = useState(false);
  const notificationStorageKey = `hrms-dismissed-notifications-${currentUser.id}`;
  const staticNotificationId = 'leave-approved-july-20-21';

  useEffect(() => {
    const hydrateDismissedNotifications = window.setTimeout(() => {
      try {
        const storedNotifications = window.localStorage.getItem(notificationStorageKey);
        setDismissedNotificationIds(storedNotifications ? JSON.parse(storedNotifications) as string[] : []);
      } catch {
        setDismissedNotificationIds([]);
      }
    }, 0);

    return () => window.clearTimeout(hydrateDismissedNotifications);
  }, [notificationStorageKey]);

  const [userAssignedAssets, setUserAssignedAssets] = useState<AssignedAssetNotification[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      fetch(`/api/assets?employeeId=${encodeURIComponent(currentUser.id)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.success && Array.isArray(json.data)) {
            setUserAssignedAssets(json.data);
          }
        })
        .catch((err) => console.error('Failed to fetch assigned assets for notifications:', err));
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (!showProfile) return;

    const closeProfileMenu = (event: MouseEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfile(false);
    };

    document.addEventListener('mousedown', closeProfileMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeProfileMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [showProfile]);

  const handleLogout = async () => {
    setShowProfile(false);

    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Logout request failed');
      logout();
      window.location.replace('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const pendingLeaveRequests = leaveRequests.filter(
    (request) => request.status === 'Pending'
  );
  const visibleLeaveNotifications = pendingLeaveRequests.filter(
    (request) => !dismissedNotificationIds.includes(`leave-${request.id}`)
  );
  const activeHelpDeskTickets = helpDeskTickets.filter(
    (ticket) => ticket.status !== 'Resolved'
  );
  const visibleHelpDeskNotifications = activeHelpDeskTickets.filter(
    (ticket) => !dismissedNotificationIds.includes(`help-desk-${ticket.id}`)
  );
  const visibleAssetNotifications = userAssignedAssets.filter(
    (asset) => !dismissedNotificationIds.includes(`asset-${asset.id}`)
  );
  const hasStaticNotification = !dismissedNotificationIds.includes(staticNotificationId);
  const notificationCount = currentUser.userRole === 'admin'
    ? visibleLeaveNotifications.length + visibleHelpDeskNotifications.length
    : (hasStaticNotification ? 1 : 0) + visibleAssetNotifications.length;

  const dismissNotification = (notificationId: string) => {
    const nextIds = dismissedNotificationIds.includes(notificationId)
      ? dismissedNotificationIds
      : [...dismissedNotificationIds, notificationId];
    setDismissedNotificationIds(nextIds);
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextIds));
  };

  const clearNotifications = () => {
    const idsToDismiss = currentUser.userRole === 'admin'
      ? [
          ...visibleLeaveNotifications.map((request) => `leave-${request.id}`),
          ...visibleHelpDeskNotifications.map((ticket) => `help-desk-${ticket.id}`),
        ]
      : [
          ...(hasStaticNotification ? [staticNotificationId] : []),
          ...visibleAssetNotifications.map((asset) => `asset-${asset.id}`),
        ];
    const nextIds = Array.from(new Set([...dismissedNotificationIds, ...idsToDismiss]));
    setDismissedNotificationIds(nextIds);
    window.localStorage.setItem(notificationStorageKey, JSON.stringify(nextIds));
  };

  return (
    <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      <p className="truncate text-xs font-semibold text-[#17324A]" aria-live="polite">
        {isGreetingReady ? `${greeting}, ${currentUser.name}!` : `Welcome, ${currentUser.name}!`}
      </p>

      {/* Right Header Actions */}
      <div className="flex shrink-0 items-center gap-3">
        {/* Every role uses the same clock-in policy and shared attendance state. */}
        <div className="flex items-center bg-surface-elevated border border-border rounded-md p-0.5">
            <button
              onClick={onClockAction}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isClockedIn
                  ? 'bg-success/15 text-success border border-success/30 hover:bg-success/20'
                  : lateClockInRequest?.status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[#B0D0EA] text-[#17324A] hover:bg-[#9FC4E2]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isClockedIn ? 'bg-success' : lateClockInRequest?.status === 'pending' ? 'bg-amber-500' : 'bg-[#17324A]'}`} />
              {isClockedIn ? `Clocked In (${clockInTime})` : lateClockInRequest?.status === 'pending' ? 'HR Approval Pending' : 'Clock In Now'}
            </button>
        </div>

        {currentUser.userRole === 'employee' && (
          <button
            type="button"
            onClick={() => setIsHelpDeskOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#9FC2DC] bg-[#F4F9FC] px-2.5 py-1.5 text-xs font-semibold text-[#315B76] transition-colors hover:bg-[#E8F2FA] hover:text-[#17324A]"
            aria-label="Ask HR help desk"
            title="Ask HR help desk"
          >
            <Headset className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ask HR</span>
          </button>
        )}

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="p-1.5 rounded-md bg-surface border border-border text-secondary hover:text-foreground hover:bg-surface-elevated relative transition-colors"
            aria-label="Open notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8B3A4A] px-1 text-[9px] font-black text-white ring-2 ring-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                  Notifications
                </h4>
                <div className="flex items-center gap-2">
                  {notificationCount > 0 && (
                    <button type="button" onClick={clearNotifications} className="text-[10px] font-semibold text-[#8B3A4A] hover:underline">
                      Clear all
                    </button>
                  )}
                  <button type="button" onClick={() => setShowNotifications(false)} className="text-secondary hover:text-foreground" aria-label="Close notifications">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {currentUser.userRole === 'admin' ? (
                  visibleLeaveNotifications.length > 0 || visibleHelpDeskNotifications.length > 0 ? (
                    <>
                      {visibleLeaveNotifications.map((request) => {
                        const notificationId = `leave-${request.id}`;
                        return (
                          <div key={notificationId} className="flex gap-2 rounded bg-amber-50 p-2 transition-colors hover:bg-amber-100">
                            <Link
                              href="/leaves"
                              onClick={() => {
                                dismissNotification(notificationId);
                                setShowNotifications(false);
                              }}
                              className="flex min-w-0 flex-1 gap-2"
                            >
                              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                              <span>
                                <span className="block text-xs font-medium text-[#17324A]">Leave Approval Required</span>
                                <span className="mt-0.5 block text-[11px] text-[#52677A]">{request.employeeName} submitted {request.leaveType.toLowerCase()} leave for {request.days} day(s).</span>
                                <span className="mt-0.5 block text-[10px] text-[#667085]">Applied {request.appliedOn} · Review request</span>
                              </span>
                            </Link>
                            <button type="button" onClick={() => dismissNotification(notificationId)} className="h-fit shrink-0 rounded p-1 text-[#8B3A4A] hover:bg-white" aria-label={`Remove notification for ${request.employeeName}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {visibleHelpDeskNotifications.map((ticket) => {
                        const notificationId = `help-desk-${ticket.id}`;
                        const isComplaint = ticket.category === 'Grievance / Complaint';
                        return (
                          <div key={notificationId} className={`flex gap-2 rounded p-2 transition-colors ${isComplaint ? 'bg-rose-50 hover:bg-rose-100' : 'bg-sky-50 hover:bg-sky-100'}`}>
                            <Link
                              href="/help-desk"
                              onClick={() => {
                                dismissNotification(notificationId);
                                setShowNotifications(false);
                              }}
                              className="flex min-w-0 flex-1 gap-2"
                            >
                              <Headset className={`mt-0.5 h-4 w-4 shrink-0 ${isComplaint ? 'text-rose-700' : 'text-sky-700'}`} />
                              <span className="min-w-0">
                                <span className="block text-xs font-medium text-[#17324A]">{isComplaint ? 'New Employee Complaint' : 'New Ask HR Request'}</span>
                                <span className="mt-0.5 block break-words text-[11px] text-[#52677A]">{ticket.employeeName}: {ticket.subject}</span>
                                <span className="mt-0.5 block text-[10px] text-[#667085]">{ticket.priority} priority · {ticket.createdAt} · Review ticket</span>
                              </span>
                            </Link>
                            <button type="button" onClick={() => dismissNotification(notificationId)} className="h-fit shrink-0 rounded p-1 text-[#8B3A4A] hover:bg-white" aria-label={`Remove notification for ticket ${ticket.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="px-2 py-4 text-center text-[11px] text-secondary">No notifications.</p>
                  )
                ) : (visibleAssetNotifications.length > 0 || hasStaticNotification) ? (
                  <>
                    {visibleAssetNotifications.map((asset) => {
                      const notificationId = `asset-${asset.id}`;
                      return (
                        <div key={notificationId} className="flex gap-2 rounded bg-[#EAF2F8] p-2 transition-colors hover:bg-[#D9E5EE]">
                          <div className="flex min-w-0 flex-1 gap-2 text-left">
                            <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-[#17324A]" />
                            <span>
                              <span className="block text-xs font-semibold text-[#17324A]">Asset Assigned</span>
                              <span className="mt-0.5 block text-[11px] text-[#52677A]">
                                A {asset.brand} {asset.name} ({asset.assetTag}) has been assigned to you by HR.
                              </span>
                              <span className="mt-0.5 block text-[10px] text-[#667085]">Assigned on {asset.lastChecked || 'today'} · Serial: {asset.serialNumber || '—'}</span>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => dismissNotification(notificationId)}
                            className="h-fit shrink-0 rounded p-1 text-[#8B3A4A] hover:bg-white"
                            aria-label={`Remove notification for asset ${asset.assetTag}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {hasStaticNotification && (
                      <div className="flex gap-2 rounded bg-surface-elevated p-2">
                        <button type="button" onClick={() => dismissNotification(staticNotificationId)} className="flex min-w-0 flex-1 gap-2 text-left">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span>
                            <span className="block text-xs font-medium text-foreground">Leave Request Approved</span>
                            <span className="mt-0.5 block text-[11px] text-secondary">Casual Leave for July 20-21 was approved by Arjun Mehta.</span>
                            <span className="mt-0.5 block text-[10px] text-muted">2 hours ago</span>
                          </span>
                        </button>
                        <button type="button" onClick={() => dismissNotification(staticNotificationId)} className="h-fit shrink-0 rounded p-1 text-[#8B3A4A] hover:bg-white" aria-label="Remove notification">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="px-2 py-4 text-center text-[11px] text-secondary">No notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className={`group flex h-10 items-center gap-2 rounded-xl border px-1.5 text-left shadow-sm transition-all sm:pr-2.5 ${showProfile ? 'border-[#8FB8D8] bg-[#E8F2FA] ring-2 ring-[#B0D0EA]/30' : 'border-[#D9E5EE] bg-white hover:border-[#9FC2DC] hover:bg-[#F5F9FC]'}`}
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={showProfile}
          >
            <span className="relative shrink-0">
              <img src={currentUser.avatar} alt="" className="h-7 w-7 rounded-lg border border-[#B0D0EA] object-cover" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <span className="hidden max-w-32 min-w-0 sm:block">
              <span className="block truncate text-[11px] font-bold text-[#17324A]">{currentUser.name}</span>
              <span className="block truncate text-[9px] font-medium text-[#667085]">{roleLabel} · {currentUser.department}</span>
            </span>
            <ChevronDown className={`hidden h-3.5 w-3.5 text-[#52677A] transition-transform duration-200 sm:block ${showProfile ? 'rotate-180' : ''}`} />
          </button>

          {showProfile && (
            <div role="menu" className="absolute right-0 z-50 mt-2.5 flex max-h-[calc(100dvh-4.5rem)] w-[min(23rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-[#9FC2DC] bg-white shadow-[0_20px_55px_rgba(23,50,74,0.18)]">
              <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#17324A] via-[#234B68] to-[#315B76] px-4 pb-5 pt-4 text-white">
                <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#B0D0EA]/15" />
                <div className="absolute -bottom-10 right-16 h-20 w-20 rounded-full bg-white/5" />
                <div className="relative flex items-center gap-3.5">
                  <span className="relative shrink-0 rounded-2xl bg-white/15 p-1 ring-1 ring-white/25">
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-14 w-14 rounded-xl object-cover" />
                    <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#234B68] bg-emerald-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-bold">{currentUser.name}</p>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#DCEAF4]">{roleLabel}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-[#DCEAF4]">{currentUser.role}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[10px] text-white/70"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Active account</p>
                  </div>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                <section>
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#667085]">Profile information</p>
                  <dl className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="col-span-1 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-2.5">
                      <dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><IdCard className="h-3.5 w-3.5 text-[#49758F]" />Employee ID</dt>
                      <dd className="mt-1 truncate font-bold text-[#17324A]">{currentUser.employeeCode}</dd>
                    </div>
                    <div className="col-span-1 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-2.5">
                      <dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><UserRound className="h-3.5 w-3.5 text-[#49758F]" />Department</dt>
                      <dd className="mt-1 truncate font-bold text-[#17324A]">{currentUser.department}</dd>
                    </div>
                    <div className="col-span-2 rounded-xl border border-[#D9E5EE] bg-[#F5F9FC] p-2.5">
                      <dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><Mail className="h-3.5 w-3.5 text-[#49758F]" />Work email</dt>
                      <dd className="mt-1 break-all font-semibold text-[#17324A]">{currentUser.email}</dd>
                    </div>
                    {employeeProfile && (
                      <>
                        <div className="rounded-xl border border-[#D9E5EE] bg-white p-2.5"><dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><Phone className="h-3.5 w-3.5 text-[#49758F]" />Phone</dt><dd className="mt-1 truncate font-semibold text-[#17324A]">{employeeProfile.phone}</dd></div>
                        <div className="rounded-xl border border-[#D9E5EE] bg-white p-2.5"><dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><MapPin className="h-3.5 w-3.5 text-[#49758F]" />Location</dt><dd className="mt-1 truncate font-semibold text-[#17324A]">{employeeProfile.location}</dd></div>
                        <div className="rounded-xl border border-[#D9E5EE] bg-white p-2.5"><dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><CalendarDays className="h-3.5 w-3.5 text-[#49758F]" />Joined</dt><dd className="mt-1 truncate font-semibold text-[#17324A]">{employeeProfile.joinDate}</dd></div>
                        <div className="rounded-xl border border-[#D9E5EE] bg-white p-2.5"><dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#667085]"><UserRound className="h-3.5 w-3.5 text-[#49758F]" />Manager</dt><dd className="mt-1 truncate font-semibold text-[#17324A]">{employeeProfile.manager || 'Not assigned'}</dd></div>
                      </>
                    )}
                  </dl>
                </section>

                <section className="mt-4 border-t border-[#D9E5EE] pt-4">
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-[#667085]">Quick access</p>
                  <div className="space-y-1.5">
                    {profileLinks.map(({ label, href, icon: Icon }) => (
                      <Link key={href} href={href} role="menuitem" onClick={() => setShowProfile(false)} className="group/link flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-xs font-semibold text-[#52677A] transition-all hover:border-[#B0D0EA] hover:bg-[#E8F2FA] hover:text-[#17324A]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D9E5EE] bg-white text-[#49758F] shadow-sm transition-colors group-hover/link:border-[#9FC2DC]"><Icon className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        <span className="text-sm text-[#8CA2B3] transition-transform group-hover/link:translate-x-0.5">›</span>
                      </Link>
                    ))}
                  </div>
                </section>
              </div>

              <div className="shrink-0 border-t border-[#D9E5EE] bg-[#F9FBFD] p-2.5 shadow-[0_-6px_18px_rgba(23,50,74,0.05)]">
                <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-50">
                  <LogOut className="h-4 w-4" />
                  Logout from HRMS
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <HRHelpDeskModal isOpen={isHelpDeskOpen} onClose={() => setIsHelpDeskOpen(false)} />
    </header>
  );
};

