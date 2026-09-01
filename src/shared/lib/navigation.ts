import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Backpack,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  Compass,
  CreditCard,
  DoorOpen,
  FileCheck,
  FileText,
  GraduationCap,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  ListTodo,
  Receipt,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  Target,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import type { UserRole } from '@/shared/providers/HRMSContext';

export interface NavigationItem {
  name: string;
  href: string;
  routePrefix?: string;
  icon: LucideIcon;
  section: 'Workspace' | 'My Work' | 'Growth & Talent' | 'HR Operations';
  roles: readonly UserRole[];
}

const ALL_ROLES = ['employee', 'manager', 'admin'] as const satisfies readonly UserRole[];

export const NAV_ITEMS: readonly NavigationItem[] = [
  // Workspace
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'Workspace', roles: ALL_ROLES },
  { name: 'My Team', href: '/my-team', icon: UsersRound, section: 'Workspace', roles: ['manager'] },
  { name: 'Employee Directory', href: '/employees', icon: Users, section: 'Workspace', roles: ALL_ROLES },

  // My Work & Compensation
  { name: 'Attendance & Time', href: '/attendance', icon: Clock, section: 'My Work', roles: ALL_ROLES },
  { name: 'Leave Management', href: '/leaves', icon: CalendarDays, section: 'My Work', roles: ALL_ROLES },
  { name: 'Meetings & Calendar', href: '/meetings/calendar', routePrefix: '/meetings', icon: CalendarRange, section: 'My Work', roles: ALL_ROLES },
  { name: 'Tasks', href: '/tasks', icon: ListTodo, section: 'My Work', roles: ALL_ROLES },
  { name: 'Payroll & Payslips', href: '/payroll', icon: CreditCard, section: 'My Work', roles: ALL_ROLES },
  { name: 'Expenses & Claims', href: '/expenses', icon: Receipt, section: 'My Work', roles: ALL_ROLES },
  { name: 'Benefits & Insurance', href: '/benefits', icon: HeartHandshake, section: 'My Work', roles: ALL_ROLES },
  { name: 'My Assets', href: '/my-assets', icon: Backpack, section: 'My Work', roles: ALL_ROLES },

  // Growth & Talent
  { name: 'Performance & OKR', href: '/performance', icon: Target, section: 'Growth & Talent', roles: ALL_ROLES },
  { name: 'Career & Talent', href: '/talent', icon: Compass, section: 'Growth & Talent', roles: ALL_ROLES },
  { name: 'Skills Intelligence', href: '/skills', icon: Sparkles, section: 'Growth & Talent', roles: ALL_ROLES },
  { name: 'Training & LMS', href: '/lms', icon: GraduationCap, section: 'Growth & Talent', roles: ALL_ROLES },
  { name: 'Employee Engagement', href: '/engagement', icon: Heart, section: 'Growth & Talent', roles: ALL_ROLES },

  // HR Operations
  { name: 'Recruitment ATS', href: '/recruitment', icon: ScanSearch, section: 'HR Operations', roles: ['admin'] },
  { name: 'Onboarding & BGV', href: '/employee-lifecycle', icon: UserPlus, section: 'HR Operations', roles: ['admin'] },
  { name: 'Exit & Clearance', href: '/exit', icon: DoorOpen, section: 'HR Operations', roles: ALL_ROLES },
  { name: 'Documents', href: '/documents', icon: FileText, section: 'HR Operations', roles: ALL_ROLES },
  { name: 'Asset & Inventory', href: '/assets', icon: Archive, section: 'HR Operations', roles: ['admin'] },
  { name: 'Policy Center', href: '/policies', icon: BookOpenCheck, section: 'HR Operations', roles: ALL_ROLES },
  { name: 'Grievance / Complaint', href: '/grievances', icon: ShieldAlert, section: 'HR Operations', roles: ['employee', 'manager'] },
  { name: 'People Analytics', href: '/analytics', icon: BarChart3, section: 'HR Operations', roles: ['admin'] },
];

const matchesRoute = (pathname: string, item: NavigationItem) => {
  if (item.href === '/') return pathname === '/';

  const route = item.routePrefix ?? item.href;
  return pathname === route || pathname.startsWith(`${route}/`);
};

export const isRouteAllowedForRole = (pathname: string, role: UserRole) => {
  const route = NAV_ITEMS.find((item) => matchesRoute(pathname, item));
  return route?.roles.includes(role) ?? true;
};

export const isNavigationItemActive = (pathname: string, item: NavigationItem) =>
  matchesRoute(pathname, item);
