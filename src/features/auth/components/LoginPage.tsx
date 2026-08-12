'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  Lock,
  Mail,
  ArrowRight,
} from 'lucide-react';
import {
  useHRMS,
  UserRole,
  DEMO_ACCOUNTS,
} from '@/shared/providers/HRMSContext';

const ROLE_OPTIONS: Array<{
  role: UserRole;
  label: string;
  access: string;
  icon: React.FC<{ className?: string }>;
}> = [
  {
    role: 'employee',
    label: 'Employee',
    access: 'ESS Portal',
    icon: UserCheck,
  },
  {
    role: 'manager',
    label: 'Manager',
    access: 'Team View',
    icon: Briefcase,
  },
  {
    role: 'admin',
    label: 'HR Admin',
    access: 'Full Access',
    icon: ShieldCheck,
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useHRMS();
  const router = useRouter();

  const [selectedRole, setSelectedRole] =
    useState<UserRole>('employee');

  const [email, setEmail] = useState(
    DEMO_ACCOUNTS.employee.email
  );

  const [password, setPassword] =
    useState('••••••••••••');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(DEMO_ACCOUNTS[role].email);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole);
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-20 w-36 mb-2">
            <img
              src="/logo.png"
              alt="MYLOTIC GROUP Logo"
              className="h-full w-full object-contain filter drop-shadow-sm"
            />
          </div>

          <h1 className="text-xl font-extrabold text-[#17324A] tracking-tight">
            MYLOTIC GROUP PVT.LTD
          </h1>

          <p className="text-xs text-[#5F7180] mt-1">
            Sign in to your secure organization portal
          </p>
        </div>

        {/* Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#D9E5EE] shadow-xl space-y-6">

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium uppercase tracking-wider text-[#5F7180] block">
              Authorization Role
            </label>

            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map(
                ({ role, label, access, icon: Icon }) => {
                  const account = DEMO_ACCOUNTS[role];
                  const isSelected =
                    selectedRole === role;

                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      aria-pressed={isSelected}
                      className={`login-role-card p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-[#B0D0EA] border-[#17324A] text-[#17324A] shadow-sm'
                          : 'bg-white border-[#D9E5EE] text-[#5F7180] hover:border-[#B0D0EA] hover:bg-[#F5F9FC] hover:text-[#17324A]'
                      }`}
                    >
                      <span className="login-avatar-wrap block w-12 h-12 mx-auto mb-2 rounded-2xl p-0.5 bg-[#B0D0EA]">
                        <img
                          src={account.avatar}
                          alt={`${account.name} profile`}
                          className="w-full h-full rounded-[14px] object-cover"
                        />
                      </span>

                      <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-[#17324A]" />

                      <span className="text-xs font-semibold block text-[#17324A]">
                        {label}
                      </span>

                      <span className="text-[10px] text-[#5F7180] mt-0.5 block">
                        {access}
                      </span>

                      <span className="text-[10px] text-[#5F7180] mt-1 block truncate">
                        {account.name}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleFormSubmit}
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-[#17324A] mb-1.5">
                Work Email Address
              </label>

              <div className="relative">
                <Mail className="w-4 h-4 text-[#5F7180] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] placeholder:text-[#7A8B99] focus:outline-none focus:border-[#17324A] focus:ring-1 focus:ring-[#B0D0EA] font-mono transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-[#17324A] mb-1.5">
                Password
              </label>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#5F7180] absolute left-3.5 top-1/2 -translate-y-1/2" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F5F9FC] border border-[#D9E5EE] rounded-xl text-xs text-[#17324A] placeholder:text-[#7A8B99] focus:outline-none focus:border-[#17324A] focus:ring-1 focus:ring-[#B0D0EA] font-mono transition-colors"
                  required
                />
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#17324A] hover:bg-[#234B68] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors mt-2 shadow-sm"
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Active Account Preview */}
          <div className="p-3 rounded-xl bg-[#B0D0EA] border border-[#9FC5E2] flex items-center gap-3">
            <img
              src={DEMO_ACCOUNTS[selectedRole].avatar}
              alt={DEMO_ACCOUNTS[selectedRole].name}
              className="w-9 h-9 rounded-lg object-cover border border-[#D9E5EE] login-preview-avatar"
            />

            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#17324A] truncate">
                {DEMO_ACCOUNTS[selectedRole].name}
              </p>

              <p className="text-[11px] text-[#17324A] font-medium">
                {DEMO_ACCOUNTS[selectedRole].role}
              </p>

              <p className="text-[10px] text-[#5F7180]">
                {DEMO_ACCOUNTS[selectedRole].department}{' '}
                Department
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#667085] mt-5">
          MYLOTIC GROUP PVT.LTD HRMS • Version 4.2.0 •
          Secured with OAuth2/SSO
        </p>
      </div>
    </div>
  );
};