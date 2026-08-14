import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  Clock,
  CreditCard,
  FileText,
  Headset,
  LayoutDashboard,
  ScanSearch,
  ShieldAlert,
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
  section: 'Workspace' | 'My Work' | 'Resources' | 'HR Operations';
  roles: readonly UserRole[];
}

const ALL_ROLES = ['employee', 'manager', 'admin'] as const satisfies readonly UserRole[];

export const NAV_ITEMS: readonly NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, section: 'Workspace', roles: ALL_ROLES },
  { name: 'My Team', href: '/my-team', icon: UsersRound, section: 'Workspace', roles: ['manager'] },
  { name: 'Employee Directory', href: '/employees', icon: Users, section: 'Workspace', roles: ['manager', 'admin'] },
  { name: 'Attendance & Time', href: '/attendance', icon: Clock, section: 'My Work', roles: ALL_ROLES },
  { name: 'Leave Management', href: '/leaves', icon: CalendarDays, section: 'My Work', roles: ALL_ROLES },
  { name: 'Meetings & Calendar', href: '/meetings/calendar', routePrefix: '/meetings', icon: CalendarRange, section: 'My Work', roles: ALL_ROLES },
  { name: 'Payroll & Payslips', href: '/payroll', icon: CreditCard, section: 'My Work', roles: ALL_ROLES },
  { name: 'KRA', href: '/performance', icon: Target, section: 'Resources', roles: ALL_ROLES },
  { name: 'Documents', href: '/documents', icon: FileText, section: 'Resources', roles: ALL_ROLES },
  { name: 'Policy Center', href: '/policies', icon: BookOpenCheck, section: 'Resources', roles: ALL_ROLES },
  { name: 'Grievance / Complaint', href: '/grievances', icon: ShieldAlert, section: 'Resources', roles: ['employee'] },
  { name: 'Reports & Analytics', href: '/analytics', icon: BarChart3, section: 'HR Operations', roles: ['admin'] },
  { name: 'HR Help Desk', href: '/help-desk', icon: Headset, section: 'HR Operations', roles: ['admin'] },
  { name: 'Asset & Inventory', href: '/assets', icon: Archive, section: 'HR Operations', roles: ['admin'] },
  { name: 'Recruitment', href: '/recruitment', icon: ScanSearch, section: 'HR Operations', roles: ['admin'] },
  { name: 'Employee Lifecycle', href: '/employee-lifecycle', icon: UserPlus, section: 'HR Operations', roles: ['admin'] },
];

const matchesRoute = (pathname: string, item: NavigationItem) => {
  if (item.href === '/') return pathname === '/';

  const route = item.routePrefix ?? item.href;
  return pathname === route || pathname.startsWith(`${route}/`);
};

export const isRouteAllowedForRole = (pathname: string, role: UserRole) => {
  const route = NAV_ITEMS.find((item) => matchesRoute(pathname, item));
  return route?.roles.includes(role) ?? false;
};

export const isNavigationItemActive = (pathname: string, item: NavigationItem) =>
  matchesRoute(pathname, item);
