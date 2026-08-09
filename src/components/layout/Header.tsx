'use client';

import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

interface HeaderProps {
  onClockAction: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onClockAction }) => {
  const { currentUser, isClockedIn, clockInTime, lateClockInRequest } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-end">
      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* Employee quick check-in uses the same policy as dashboard and attendance. */}
        {currentUser.userRole === 'employee' && (
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
        )}

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-md bg-surface border border-border text-secondary hover:text-foreground hover:bg-surface-elevated relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-accent absolute top-1 right-1 ring-1 ring-surface" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-border">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-accent" />
                  Notifications
                </h4>
                <button onClick={() => setShowNotifications(false)} className="text-secondary hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="p-2 rounded bg-surface-elevated border border-border flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Leave Request Approved</p>
                    <p className="text-[11px] text-secondary">Casual Leave for July 20-21 was approved by Arjun Mehta.</p>
                    <span className="text-[10px] text-muted mt-0.5 block">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

