'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Bell,
  Clock,
  LogOut,
  ShieldCheck,
  UserCheck,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

export const Header: React.FC = () => {
  const { currentUser, logout, isClockedIn, clockInTime, toggleClockIn } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = () => {
    switch (currentUser.userRole) {
      case 'admin':
        return { label: 'HR Admin', icon: ShieldCheck, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
      case 'manager':
        return { label: 'Manager', icon: Briefcase, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
      default:
        return { label: 'Employee', icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Global Search Bar */}
      <div className="relative w-72">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees, policies, leaves..."
          className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
        />
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-4">
        {/* Live Clock & Quick Check-in Button */}
        <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
          <div className="px-3 py-1 text-xs font-mono font-medium text-indigo-400 flex items-center gap-2 border-r border-slate-700/80">
            <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{currentTime || '09:00 AM'}</span>
          </div>
          <button
            onClick={toggleClockIn}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isClockedIn
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isClockedIn ? 'bg-emerald-400 animate-ping' : 'bg-white'}`} />
            {isClockedIn ? `Clocked In (${clockInTime})` : 'Clock In Now'}
          </button>
        </div>

        {/* Current Logged-in Role Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${badge.color}`}>
          <BadgeIcon className="w-3.5 h-3.5" />
          <span>{badge.label} Portal</span>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/60 relative transition-all"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-1.5 right-1.5 ring-2 ring-slate-900" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-400" />
                  Notifications
                </h4>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-slate-200">Leave Request Approved</p>
                    <p className="text-[11px] text-slate-400">Casual Leave for July 20-21 was approved by Alex Rivera.</p>
                    <span className="text-[9px] text-slate-500 mt-1 block">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Action Button */}
        <button
          onClick={logout}
          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-all flex items-center gap-1 text-xs font-semibold"
          title="Sign out of HRMS"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
