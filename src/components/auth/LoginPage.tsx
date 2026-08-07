'use client';

import React, { useState } from 'react';
import { Building2, ShieldCheck, UserCheck, Briefcase, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react';
import { useHRMS, UserRole, DEMO_ACCOUNTS } from '@/context/HRMSContext';

export const LoginPage: React.FC = () => {
  const { login } = useHRMS();
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS.employee.email);
  const [password, setPassword] = useState<string>('••••••••••••');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(DEMO_ACCOUNTS[role].email);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Apex HRMS Portal</h1>
          <p className="text-xs text-slate-400">Select your authorization role to enter your dedicated dashboard</p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Role Selection Buttons */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block text-center">
              Choose Login Role Portal
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleRoleSelect('employee')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  selectedRole === 'employee'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 ring-2 ring-emerald-500/20 shadow-lg'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <UserCheck className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                <span className="text-xs font-bold block">Employee</span>
                <span className="text-[9px] text-slate-500">ESS View</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('manager')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  selectedRole === 'manager'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-400 ring-2 ring-blue-500/20 shadow-lg'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Briefcase className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                <span className="text-xs font-bold block">Manager</span>
                <span className="text-[9px] text-slate-500">Team View</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('admin')}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 ring-2 ring-amber-500/20 shadow-lg'
                    : 'bg-slate-850 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <ShieldCheck className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                <span className="text-xs font-bold block">HR Admin</span>
                <span className="text-[9px] text-slate-500">Full Access</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-850 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-850 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all mt-2"
            >
              Sign In to {selectedRole.toUpperCase()} Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Active Account Preview */}
          <div className="p-3.5 rounded-2xl bg-slate-850/80 border border-slate-800 flex items-center gap-3">
            <img
              src={DEMO_ACCOUNTS[selectedRole].avatar}
              alt={DEMO_ACCOUNTS[selectedRole].name}
              className="w-10 h-10 rounded-full object-cover border border-slate-700"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100">{DEMO_ACCOUNTS[selectedRole].name}</p>
              <p className="text-[11px] text-indigo-400 font-medium">{DEMO_ACCOUNTS[selectedRole].role}</p>
              <p className="text-[10px] text-slate-500">{DEMO_ACCOUNTS[selectedRole].department} Dept</p>
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
