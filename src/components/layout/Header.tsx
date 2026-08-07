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
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useHRMS } from '@/context/HRMSContext';

export const Header: React.FC = () => {
  const { currentUser, logout, isClockedIn, clockInTime, toggleClockIn } = useHRMS();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    const saved = localStorage.getItem('hrms_theme');
    if (saved === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true);
    }

    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      setIsDarkMode(false);
      localStorage.setItem('hrms_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      setIsDarkMode(true);
      localStorage.setItem('hrms_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  };

  const getRoleBadge = () => {
    switch (currentUser.userRole) {
      case 'admin':
        return { label: 'HR Admin', icon: ShieldCheck, color: 'bg-[#9e6a03]/15 text-[#d29922] border-[#9e6a03]/30' };
      case 'manager':
        return { label: 'Manager', icon: Briefcase, color: 'bg-[#1f6feb]/15 text-[#58a6ff] border-[#1f6feb]/30' };
      default:
        return { label: 'Employee', icon: UserCheck, color: 'bg-[#8B3A4A]/15 text-[#B86B78] border-[#8B3A4A]/30' };
    }
  };

  const badge = getRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <header className="h-14 border-b border-[#30363d] bg-[#161b22]/90 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Global Search Bar */}
      <div className="relative w-64">
        <Search className="w-3.5 h-3.5 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search employees, policies..."
          className="w-full pl-8 pr-3 py-1 bg-[#0d1117] border border-[#30363d] rounded-md text-xs text-[#f0f6fc] placeholder-[#8b949e] focus:outline-none focus:border-[#8B3A4A] transition-colors"
        />
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">
        {/* Live Clock & Quick Check-in Button */}
        <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-md p-0.5">
          <div className="px-2.5 py-1 text-[11px] font-mono text-[#3fb950] flex items-center gap-1.5 border-r border-[#30363d]">
            <Clock className="w-3.5 h-3.5 text-[#3fb950]" />
            <span>{currentTime || '09:00 AM'}</span>
          </div>
          <button
            onClick={toggleClockIn}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              isClockedIn
                ? 'bg-[#8B3A4A]/20 text-[#B86B78] border border-[#8B3A4A]/30 hover:bg-[#8B3A4A]/30'
                : 'bg-[#8B3A4A] text-white hover:bg-[#A04456]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isClockedIn ? 'bg-[#B86B78]' : 'bg-white'}`} />
            {isClockedIn ? `Clocked In (${clockInTime})` : 'Clock In Now'}
          </button>
        </div>

        {/* Simple Sun/Moon Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg bg-surface-elevated border border-border text-foreground hover:bg-border transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8B3A4A] flex items-center justify-center"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#8B3A4A]" />}
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-md bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#30363d] relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-[#8B3A4A] absolute top-1 right-1 ring-1 ring-[#161b22]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50 p-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#30363d]">
                <h4 className="text-xs font-semibold text-[#f0f6fc] flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#8B3A4A]" />
                  Notifications
                </h4>
                <button onClick={() => setShowNotifications(false)} className="text-[#8b949e] hover:text-[#f0f6fc]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="p-2 rounded bg-[#0d1117] border border-[#30363d] flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-[#f0f6fc]">Leave Request Approved</p>
                    <p className="text-[11px] text-[#8b949e]">Casual Leave for July 20-21 was approved by Alex Rivera.</p>
                    <span className="text-[10px] text-[#6e7681] mt-0.5 block">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Action Button */}
        <button
          onClick={logout}
          className="p-1.5 rounded-md bg-[#da3633]/10 hover:bg-[#da3633]/20 border border-[#da3633]/30 text-[#f85149] transition-colors flex items-center gap-1 text-xs font-medium"
          title="Sign out of HRMS"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

