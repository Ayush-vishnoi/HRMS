'use client';

import React from 'react';
import { useHRMS } from '@/context/HRMSContext';
import { EmployeeDashboard } from '@/components/dashboard/EmployeeDashboard';
import { TeamLeadDashboard } from '@/components/dashboard/TeamLeadDashboard';
import { ManagerDashboard } from '@/components/dashboard/ManagerDashboard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { CeoDashboard } from '@/components/dashboard/CeoDashboard';

export default function DashboardPage() {
  const { currentUser } = useHRMS();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {currentUser.userRole === 'employee' && <EmployeeDashboard />}
      {currentUser.userRole === 'team_lead' && <TeamLeadDashboard />}
      {currentUser.userRole === 'manager' && <ManagerDashboard />}
      {currentUser.userRole === 'admin' && <AdminDashboard />}
      {currentUser.userRole === 'ceo' && <CeoDashboard />}
    </div>
  );
}
