'use client';

import React from 'react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { EmployeeDashboard } from '@/features/dashboard/components/EmployeeDashboard';
import { ManagerDashboard } from '@/features/dashboard/components/ManagerDashboard';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';
import { CeoDashboard } from '@/features/dashboard/components/CeoDashboard';
import { SuperAdminDashboard } from '@/features/dashboard/components/SuperAdminDashboard';

export default function DashboardPage() {
  const { currentUser } = useHRMS();

  // Executive / system-admin dashboards are chosen by the RAW role; both
  // otherwise share the 'admin' RBAC surface.
  if (currentUser.rawRole === 'super_admin') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <SuperAdminDashboard />
      </div>
    );
  }

  if (currentUser.rawRole === 'ceo') {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <CeoDashboard />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {currentUser.userRole === 'employee' && <EmployeeDashboard />}
      {currentUser.userRole === 'manager' && <ManagerDashboard />}
      {currentUser.userRole === 'admin' && <AdminDashboard />}
    </div>
  );
}
