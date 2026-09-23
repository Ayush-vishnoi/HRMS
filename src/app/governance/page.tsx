'use client';

import React from 'react';
import { useHRMS } from '@/shared/providers/HRMSContext';
import { GovernanceControls } from '@/features/dashboard/components/GovernanceControls';

export default function GovernancePage() {
  const { currentUser, activeDelegations } = useHRMS();

  // Governance & Controls is the CEO's authority surface. HR Admins can reach it
  // only while they hold an active delegation; everyone else sees nothing to do.
  const isCeo = currentUser.rawRole === 'ceo';
  const hasDelegatedPower = activeDelegations.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isCeo || hasDelegatedPower ? (
        <GovernanceControls />
      ) : (
        <div className="rounded-2xl border border-[#D9E5EE] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#17324A]">No governance authority</p>
          <p className="mt-1 text-xs text-[#667085]">
            This workspace is available to the CEO and to HR Admins holding a delegated executive power.
          </p>
        </div>
      )}
    </div>
  );
}
