'use client';

import React from 'react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { EmployeeDashboard } from '@/features/dashboard/components/EmployeeDashboard';
import { ManagerDashboard } from '@/features/dashboard/components/ManagerDashboard';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { ExecutiveDashboard } from '@/features/dashboard/components/ExecutiveDashboard';

export default function DashboardPage() {
  const { currentUser } = useHRMS();

  // CEO (rawRole) gets the Executive workspace; the role is normalized to
  // 'admin' for RBAC, so branch on rawRole before the admin fallback.
  const isCeo = currentUser.rawRole === 'ceo';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isCeo && <ExecutiveDashboard />}
      {!isCeo && currentUser.userRole === 'employee' && <EmployeeDashboard />}
      {!isCeo && currentUser.userRole === 'manager' && <ManagerDashboard />}
      {!isCeo && currentUser.userRole === 'admin' && <AdminDashboard />}
    </div>
  );
}
