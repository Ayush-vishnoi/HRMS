'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
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
  MessageSquare,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { useChat } from '@/shared/providers/ChatContext';
import { authFetch } from '@/lib/api-client';
import { HRHelpDeskModal } from '@/features/help-desk/components/HRHelpDeskModal';
import { getTimeGreeting } from '@/shared/lib/formatters';

interface HeaderProps {
  onClockAction: () => void;
}

interface UserNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const getNotificationIcon = (type: string): { Icon: typeof Bell; className: string } => {
  switch (type) {
    case 'Leave':
    case 'Approval':
      return { Icon: CalendarDays, className: 'bg-amber-50 text-amber-700' };
    case 'HelpDesk':
      return { Icon: Headset, className: 'bg-sky-50 text-sky-700' };
    case 'Meeting':
      return { Icon: UsersRound, className: 'bg-indigo-50 text-indigo-700' };
    case 'Asset':
      return { Icon: Laptop, className: 'bg-[#EAF2F8] text-[#17324A]' };
    case 'Attendance':
      return { Icon: Clock3, className: 'bg-emerald-50 text-emerald-700' };
    case 'Expense':
    case 'Payroll':
    case 'Policy':
    case 'Document':
    case 'Documents':
    case 'Exit':
      return { Icon: FileText, className: 'bg-rose-50 text-rose-700' };
    case 'Performance':
    case 'TaskAssignment':
      return { Icon: Sparkles, className: 'bg-violet-50 text-violet-700' };
    case 'Recruitment':
    case 'Employee':
    case 'Onboarding':
      return { Icon: UserRound, className: 'bg-teal-50 text-teal-700' };
    case 'Success':
    case 'Celebration':
      return { Icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700' };
    case 'Warning':
    case 'Alert':
      return { Icon: Bell, className: 'bg-orange-50 text-orange-700' };
    case 'Announcement':
      return { Icon: MessageSquare, className: 'bg-blue-50 text-blue-700' };
    default:
      return { Icon: Bell, className: 'bg-[#EAF2F8] text-[#49758F]' };
  }
};

const formatNotificationTime = (createdAt: string) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

export const Header: React.FC<HeaderProps> = ({ onClockAction }) => {
  const {
    currentUser,
    isClockedIn,
    clockInTime,
    lateClockInRequest,
    logout,
  } = useHRMS();
  const { unreadCount, openChatWith, conversations } = useChat();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [greeting, setGreeting] = useState('Good Morning');
  const [isGreetingReady, setIsGreetingReady] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [employeeProfile, setEmployeeProfile] = useState({ phone: '', location: '', joinDate: '', manager: '' });

  useEffect(() => {
    if (!currentUser.id) return;
    authFetch<{ success: boolean; data: any }>(`/api/employees/${currentUser.id}`)
      .then((res) => {
        if (res?.success && res.data) {
          setEmployeeProfile({
            phone: res.data.phone || '',
            location: res.data.location || '',
            joinDate: res.data.joinDate || '',
            manager: typeof res.data.manager === 'string' ? res.data.manager : '',
          });
        }
      })
      .catch(() => {});
  }, [currentUser.id]);
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

  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;
    const loadNotifications = async () => {
      try {
        // Backend returns a raw array of notifications for the current user.
        const data = await authFetch<UserNotificationItem[]>('/api/notifications');
        if (isMounted && Array.isArray(data)) {
          setNotifications(data);
          setUnreadNotificationCount(data.filter((n) => !n.isRead).length);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        if (isMounted) setIsLoadingNotifications(false);
      }
    };

    void loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [currentUser.id]);

  const refreshNotifications = async () => {
    try {
      const data = await authFetch<UserNotificationItem[]>('/api/notifications');
      if (Array.isArray(data)) {
        setNotifications(data);
        setUnreadNotificationCount(data.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.isRead) return;

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification,
      ),
    );
    setUnreadNotificationCount((prev) => Math.max(0, prev - 1));

    try {
      await authFetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target) return;

    // Backend has no per-notification delete; mark as read instead so it
    // stops counting towards the unread badge.
    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
    if (!target.isRead) {
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await authFetch(`/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
      });
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadNotificationCount(0);

    try {
      await authFetch('/api/notifications/read-all', { method: 'PATCH' });
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
    }
  };

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

    // The backend is stateless (JWT only, no logout endpoint), so signing out
    // is purely a client-side concern: clear the token and redirect.
    try {
      logout();
      window.localStorage.setItem('hrms_auth_event', `logout:${Date.now()}`);
      window.location.replace('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
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

        {/* Real-Time Internal Chat Button */}
        <button
          type="button"
          onClick={() => {
            setShowNotifications(false);
            setShowProfile(false);
            const targetId = conversations[0]?.employeeId || (currentUser.userRole === 'manager' ? 'EMP-003' : 'EMP-002');
            void openChatWith(targetId);
          }}
          className="p-1.5 rounded-md bg-surface border border-border text-secondary hover:text-foreground hover:bg-surface-elevated relative transition-colors cursor-pointer"
          aria-label="Open internal chat"
          title="Open Internal Real-time Chat"
        >
          <MessageSquare className="w-4 h-4 text-[#17324A]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2d577b] px-1 text-[9px] font-black text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const opening = !showNotifications;
              setShowNotifications(opening);
              setShowProfile(false);
              if (opening) void refreshNotifications();
            }}
            className="p-1.5 rounded-md bg-surface border border-border text-secondary hover:text-foreground hover:bg-surface-elevated relative transition-colors"
            aria-label="Open notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8B3A4A] px-1 text-[9px] font-black text-white ring-2 ring-white">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                  Notifications
                  {unreadNotificationCount > 0 && (
                    <span className="rounded-full bg-[#8B3A4A] px-1.5 py-0.5 text-[9px] font-black text-white">+{unreadNotificationCount}</span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {notifications.length > 0 && (
                    <button type="button" onClick={clearAllNotifications} className="text-[10px] font-semibold text-rose-600 hover:underline">
                      Clear all
                    </button>
                  )}
                  <button type="button" onClick={() => setShowNotifications(false)} className="text-secondary hover:text-foreground" aria-label="Close notifications">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                {isLoadingNotifications ? (
                  <p className="px-2 py-4 text-center text-[11px] text-secondary">Loading notifications…</p>
                ) : notifications.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[11px] text-secondary">No notifications yet. Updates across HRMS will appear here.</p>
                ) : (
                  notifications.map((notification) => {
                    const { Icon, className } = getNotificationIcon(notification.type);
                    const rowClass = notification.isRead
                      ? 'bg-surface-elevated hover:bg-[#E8F2FA]'
                      : 'bg-[#EAF2F8] hover:bg-[#D9E5EE]';
                    const content = (
                      <>
                        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded ${className}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-medium text-[#17324A]">{notification.title}</span>
                            {!notification.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B3A4A]" aria-label="Unread" />}
                          </span>
                          <span className="mt-0.5 block break-words text-[11px] text-[#52677A]">{notification.message}</span>
                          <span className="mt-0.5 block text-[10px] text-[#667085]">{formatNotificationTime(notification.createdAt)}</span>
                        </span>
                      </>
                    );

                    return (
                      <div key={notification.id} className={`flex items-start gap-1 rounded p-2 transition-colors ${rowClass}`}>
                        {notification.linkUrl ? (
                          <Link
                            href={notification.linkUrl}
                            onClick={() => {
                              void markNotificationRead(notification.id);
                              setShowNotifications(false);
                            }}
                            className="flex min-w-0 flex-1 gap-2 text-left"
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void markNotificationRead(notification.id)}
                            className="flex w-full min-w-0 flex-1 gap-2 text-left"
                          >
                            {content}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void clearNotification(notification.id)}
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#8CA2B3] transition-colors hover:bg-rose-50 hover:text-rose-600"
                          aria-label="Clear notification"
                          title="Clear notification"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })
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

