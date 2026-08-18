'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

interface LoginResponse {
  success: boolean;
  error?: string;
}

type DemoAccountRole = 'Employee' | 'Manager' | 'HR Admin';

interface DemoAccount {
  role: DemoAccountRole;
  name: string;
  email: string;
  password: string;
}

interface DemoAccountsResponse {
  success: boolean;
  data?: DemoAccount[];
}

const isDemoMode = process.env.NODE_ENV === 'development';
const demoAccountIcons = {
  Employee: UserRound,
  Manager: BriefcaseBusiness,
  'HR Admin': ShieldCheck,
} as const;

export const LoginPage: React.FC = () => {
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [isDemoAccountsLoading, setIsDemoAccountsLoading] = useState(isDemoMode);
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const [activeDemoAccountIndex, setActiveDemoAccountIndex] = useState(-1);

  useEffect(() => {
    if (!isDemoMode) return;

    const controller = new AbortController();

    const loadDemoAccounts = async () => {
      try {
        const response = await fetch('/api/auth/demo-accounts', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) return;

        const result = (await response.json()) as DemoAccountsResponse;
        if (result.success && Array.isArray(result.data)) {
          setDemoAccounts(result.data);
        }
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setDemoAccounts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsDemoAccountsLoading(false);
        }
      }
    };

    void loadDemoAccounts();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isDemoMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!demoMenuRef.current?.contains(event.target as Node)) {
        setIsDemoMenuOpen(false);
        setActiveDemoAccountIndex(-1);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isDemoMenuOpen]);

  const openDemoMenu = () => {
    if (!isDemoMode || isSubmitting) return;

    setActiveDemoAccountIndex(
      demoAccounts.findIndex((account) => account.email === identifier),
    );
    setIsDemoMenuOpen(true);
  };

  const closeDemoMenu = () => {
    setIsDemoMenuOpen(false);
    setActiveDemoAccountIndex(-1);
  };

  const selectDemoAccount = (account: DemoAccount) => {
    setIdentifier(account.email);
    setPassword(account.password);
    setError('');
    closeDemoMenu();
  };

  const handleDemoInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      closeDemoMenu();
      return;
    }

    if (!isDemoMode || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      if (
        event.key === 'Enter' &&
        isDemoMenuOpen &&
        activeDemoAccountIndex >= 0 &&
        demoAccounts[activeDemoAccountIndex]
      ) {
        event.preventDefault();
        selectDemoAccount(demoAccounts[activeDemoAccountIndex]);
      }
      return;
    }

    event.preventDefault();
    setIsDemoMenuOpen(true);

    if (demoAccounts.length === 0) {
      setActiveDemoAccountIndex(-1);
      return;
    }

    setActiveDemoAccountIndex((currentIndex) => {
      if (event.key === 'ArrowDown') {
        return currentIndex >= demoAccounts.length - 1 ? 0 : currentIndex + 1;
      }

      return currentIndex <= 0 ? demoAccounts.length - 1 : currentIndex - 1;
    });
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const result = (await response.json()) as LoginResponse;

      if (!response.ok || !result.success) {
        setError(result.error ?? 'Unable to sign in right now.');
        return;
      }

      window.localStorage.setItem('hrms_auth_event', `login:${Date.now()}`);
      window.location.replace('/');
    } catch {
      setError('Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 inline-flex h-20 w-36 items-center justify-center">
            <img
              src="/m360-logo.jpeg"
              alt="MYLOTIC GROUP Logo"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-normal text-[#17324A]">
            MYLOTIC GROUP PVT.LTD
          </h1>
          <p className="mt-1 text-xs text-[#5F7180]">
            Sign in to your secure organization portal
          </p>
        </div>

        <div className="space-y-6 rounded-lg border border-[#D9E5EE] bg-white p-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-[#E7EEF4] pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E7F0F7] text-[#17324A]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[#17324A]">Employee sign in</h2>
              <p className="text-xs text-[#5F7180]">Use your registered work credentials</p>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div
              ref={demoMenuRef}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  closeDemoMenu();
                }
              }}
            >
              <label htmlFor="login-identifier" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Work email or employee ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="login-identifier"
                  type="text"
                  role={isDemoMode ? 'combobox' : undefined}
                  autoComplete="username"
                  value={identifier}
                  onClick={openDemoMenu}
                  onFocus={openDemoMenu}
                  onKeyDown={handleDemoInputKeyDown}
                  onChange={(event) => {
                    setIdentifier(event.target.value);
                    setActiveDemoAccountIndex(-1);
                  }}
                  aria-autocomplete={isDemoMode ? 'list' : undefined}
                  aria-controls={isDemoMode ? 'demo-account-options' : undefined}
                  aria-expanded={isDemoMode ? isDemoMenuOpen : undefined}
                  aria-haspopup={isDemoMode ? 'listbox' : undefined}
                  aria-activedescendant={
                    activeDemoAccountIndex >= 0
                      ? `demo-account-option-${activeDemoAccountIndex}`
                      : undefined
                  }
                  aria-describedby={isDemoMode ? 'demo-login-hint' : undefined}
                  className="w-full rounded-lg border border-[#D9E5EE] bg-[#F5F9FC] py-2.5 pl-10 pr-4 text-sm text-[#17324A] placeholder:text-[#7A8B99] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  placeholder="name@company.com or EMP-2026-ABC123"
                  disabled={isSubmitting}
                  required
                />
                {isDemoMode && isDemoMenuOpen && (
                  <div
                    id="demo-account-options"
                    role="listbox"
                    aria-label="Demo accounts"
                    className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-lg border border-[#D9E5EE] bg-white p-1.5 shadow-xl"
                  >
                    <p
                      role="presentation"
                      className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7A8B99]"
                    >
                      Select a demo account
                    </p>
                    {isDemoAccountsLoading ? (
                      <div
                        role="status"
                        className="flex items-center gap-2 px-2.5 py-3 text-xs text-[#667085]"
                      >
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        Loading demo accounts...
                      </div>
                    ) : demoAccounts.length === 0 ? (
                      <p role="status" className="px-2.5 py-3 text-xs text-[#667085]">
                        Demo accounts are not configured.
                      </p>
                    ) : (
                      demoAccounts.map((account, index) => {
                        const Icon = demoAccountIcons[account.role];

                        return (
                          <button
                            id={`demo-account-option-${index}`}
                            key={account.role}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={activeDemoAccountIndex === index}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveDemoAccountIndex(index)}
                            onClick={() => selectDemoAccount(account)}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-[#EAF3F9] focus:bg-[#EAF3F9] focus:outline-none aria-selected:bg-[#EAF3F9]"
                          >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E7F0F7] text-[#17324A]">
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs font-semibold text-[#17324A]">
                                {account.role}
                              </span>
                              <span className="block truncate text-[11px] text-[#667085]">
                                {account.name} · {account.email}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {isDemoMode && (
                <p id="demo-login-hint" className="mt-1.5 text-[11px] text-[#667085]">
                  Click the identifier field and select Employee, Manager, or HR Admin.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-[#D9E5EE] bg-[#F5F9FC] py-2.5 pl-10 pr-4 text-sm text-[#17324A] placeholder:text-[#7A8B99] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#234B68] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-[#667085]">
          MYLOTIC GROUP PVT.LTD HRMS | Version 4.2.0 | Secure access
        </p>
      </div>
    </div>
  );
};
