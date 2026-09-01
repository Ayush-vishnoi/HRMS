'use client';

import {
  AlertTriangle,
  BookOpenCheck,
  Megaphone,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type AnnouncementCategory = 'General' | 'Event' | 'Holiday' | 'Urgent' | 'Policy';
export type AnnouncementAudience = 'All' | 'Department' | 'Location' | 'Role';

export const ANNOUNCEMENT_CATEGORIES: readonly AnnouncementCategory[] = [
  'General',
  'Event',
  'Holiday',
  'Urgent',
  'Policy',
];

export const ANNOUNCEMENT_AUDIENCES: readonly AnnouncementAudience[] = [
  'All',
  'Department',
  'Location',
  'Role',
];

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  postedByDepartment: string;
  postedByName: string | null;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
  targetAudience: AnnouncementAudience;
  targetDepartment: string | null;
  targetLocation: string | null;
  targetRole: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Relative time like "Today", "Yesterday", "4 days ago" for announcement footers. */
export const formatRelativeTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Short absolute date for management tables. */
export const formatAnnouncementDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

interface CategoryStyle {
  icon: LucideIcon;
  /** Tailwind classes for the icon container (matches existing dashboard card design). */
  containerClass: string;
}

/** Category → icon + container styling, matching the existing dashboard widget cards. */
export const categoryStyle = (category: AnnouncementCategory): CategoryStyle => {
  switch (category) {
    case 'Event':
      return { icon: Sparkles, containerClass: 'bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A]' };
    case 'Holiday':
      return { icon: ShieldAlert, containerClass: 'bg-amber-500/10 text-amber-600' };
    case 'Urgent':
      return { icon: AlertTriangle, containerClass: 'bg-red-500/10 text-red-600' };
    case 'Policy':
      return { icon: BookOpenCheck, containerClass: 'bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A]' };
    case 'General':
    default:
      return { icon: Megaphone, containerClass: 'bg-[#B0D0EA] border border-[#9FC5E2] text-[#17324A]' };
  }
};

/** Human label for an announcement's target audience. */
export const audienceLabel = (announcement: Pick<
  Announcement,
  'targetAudience' | 'targetDepartment' | 'targetLocation' | 'targetRole'
>): string => {
  switch (announcement.targetAudience) {
    case 'Department':
      return `Dept: ${announcement.targetDepartment ?? '—'}`;
    case 'Location':
      return `Location: ${announcement.targetLocation ?? '—'}`;
    case 'Role':
      return `Role: ${announcement.targetRole ?? '—'}`;
    case 'All':
    default:
      return 'All employees';
  }
};

/** Expiry/publish lifecycle status for the HR management table. */
export const announcementStatus = (
  announcement: Pick<Announcement, 'isArchived' | 'publishedAt' | 'expiresAt'>,
): { label: string; tone: 'active' | 'expired' | 'archived' | 'scheduled' } => {
  if (announcement.isArchived) return { label: 'Archived', tone: 'archived' };
  const now = Date.now();
  if (new Date(announcement.publishedAt).getTime() > now) {
    return { label: 'Scheduled', tone: 'scheduled' };
  }
  if (announcement.expiresAt && new Date(announcement.expiresAt).getTime() <= now) {
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Active', tone: 'active' };
};

/** GET /api/announcements wrapper. scope: 'dashboard' | 'admin' | undefined (all matching). */
export const fetchAnnouncements = async (
  scope?: 'dashboard' | 'admin',
): Promise<Announcement[]> => {
  const query = scope ? `?scope=${scope}` : '';
  const res = await fetch(`/api/announcements${query}`);
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Failed to fetch announcements');
  return json.data as Announcement[];
};
