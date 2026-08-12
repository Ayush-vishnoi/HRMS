'use client';

import React from 'react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { EmployeeDashboard } from '@/features/dashboard/components/EmployeeDashboard';
import { ManagerDashboard } from '@/features/dashboard/components/ManagerDashboard';
import { AdminDashboard } from '@/features/dashboard/components/AdminDashboard';

export default function DashboardPage() {
  const { currentUser } = useHRMS();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {currentUser.userRole === 'employee' && <EmployeeDashboard />}
      {currentUser.userRole === 'manager' && <ManagerDashboard />}
      {currentUser.userRole === 'admin' && <AdminDashboard />}
    </div>
  );
}
