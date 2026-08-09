'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  ShieldCheck,
  UserCheck,
  Briefcase,
  CheckCircle2,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

export const Header: React.FC = () => {
  const { currentUser, isClockedIn, clockInTime, toggleClockIn } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);

  const getRoleBadge = () => {
    switch (currentUser.userRole) {
      case 'admin':
        return { label: 'HR Admin', icon: ShieldCheck, color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
      case 'manager':
        return { label: 'Manager', icon: Briefcase, color: 'bg-[#B0D0EA]/30 text-[#17324A] border-[#B0D0EA]' };
      default:
        return { label: 'Employee', icon: UserCheck, color: 'bg-[#C96F58]/15 text-[#A95745] border-[#C96F58]/30' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Global Search Bar */}
      <div className="relative w-64">
        <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees, policies..."
          className="w-full pl-8 pr-3 py-1 bg-surface-elevated border border-border rounded-md text-xs text-foreground placeholder-muted focus:outline-none focus:border-border-strong transition-colors"
        />
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Check-in Button */}
        <div className="flex items-center bg-surface-elevated border border-border rounded-md p-0.5">
          <button
            onClick={toggleClockIn}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isClockedIn
                ? 'bg-success/15 text-success border border-success/30 hover:bg-success/20'
                : 'bg-[#B0D0EA] text-[#17324A] hover:bg-[#9FC4E2]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isClockedIn ? 'bg-success' : 'bg-[#17324A]'}`} />
            {isClockedIn ? `Clocked In (${clockInTime})` : 'Clock In Now'}
          </button>
        </div>

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

