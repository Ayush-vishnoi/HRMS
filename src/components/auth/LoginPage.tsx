'use client';

import React, { useState, useEffect } from 'react';
import { Building2, ShieldCheck, UserCheck, Briefcase, Lock, Mail, ArrowRight, Sun, Moon } from 'lucide-react';
import { useHRMS, UserRole, DEMO_ACCOUNTS } from '@/context/HRMSContext';

export const LoginPage: React.FC = () => {
  const { login } = useHRMS();
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS.employee.email);
  const [password, setPassword] = useState<string>('••••••••••••');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  useEffect(() => {
    const saved = localStorage.getItem('hrms_theme');
    if (saved === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true);
    }
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

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(DEMO_ACCOUNTS[role].email);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4 relative selection:bg-[#8B3A4A] selection:text-white transition-colors">
      {/* Top-Right Simple Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2.5 rounded-xl bg-surface border border-border text-foreground hover:bg-surface-elevated transition-colors cursor-pointer shadow-md flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#8B3A4A]"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#8B3A4A]" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-[#B86B78] shadow-sm mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground tracking-tight">Apex HRMS Enterprise</h1>
            <p className="text-xs text-muted mt-1">Sign in to your secure organization portal</p>
          </div>
        </div>

        {/* Card */}
        <div className="p-6 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-xl space-y-6">
          {/* Role Selection Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-slate-400 block">
              Authorization Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleSelect('employee')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRole === 'employee'
                    ? 'bg-[#8B3A4A]/10 border-[#8B3A4A] text-[#B86B78]'
                    : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <UserCheck className="w-4 h-4 mx-auto mb-1.5 text-[#B86B78]" />
                <span className="text-xs font-semibold block text-slate-200">Employee</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">ESS Portal</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('manager')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRole === 'manager'
                    ? 'bg-[#8B3A4A]/10 border-[#8B3A4A] text-[#B86B78]'
                    : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <Briefcase className="w-4 h-4 mx-auto mb-1.5 text-[#B86B78]" />
                <span className="text-xs font-semibold block text-slate-200">Manager</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Team View</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`p-3 rounded-xl border text-center transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-[#8B3A4A]/10 border-[#8B3A4A] text-[#B86B78]'
                    : 'bg-[#21262d] border-[#30363d] text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <ShieldCheck className="w-4 h-4 mx-auto mb-1.5 text-[#B86B78]" />
                <span className="text-xs font-semibold block text-slate-200">HR Admin</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Full Access</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#21262d] border border-[#30363d] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#8B3A4A] font-mono transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#21262d] border border-[#30363d] rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#8B3A4A] font-mono transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#8B3A4A] hover:bg-[#A04456] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-2 shadow-sm"
            >
              Sign in to {selectedRole === 'admin' ? 'HR Admin' : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Active Account Preview */}
          <div className="p-3 rounded-xl bg-[#21262d] border border-[#30363d] flex items-center gap-3">
            <img
              src={DEMO_ACCOUNTS[selectedRole].avatar}
              alt={DEMO_ACCOUNTS[selectedRole].name}
              className="w-9 h-9 rounded-lg object-cover border border-[#30363d]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{DEMO_ACCOUNTS[selectedRole].name}</p>
              <p className="text-[11px] text-[#B86B78] font-medium">{DEMO_ACCOUNTS[selectedRole].role}</p>
              <p className="text-[10px] text-slate-400">{DEMO_ACCOUNTS[selectedRole].department} Department</p>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          Apex HRMS Enterprise Edition • Version 4.2.0 • Secured with OAuth2/SSO
        </p>
      </div>
    </div>
  );
};
