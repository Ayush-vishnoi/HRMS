'use client';

import React, { useState } from 'react';
import { KeyRound, LoaderCircle, Lock, ShieldCheck } from 'lucide-react';
import { authFetch } from '@/lib/api-client';

/**
 * Full-screen mandatory password reset shown right after onboarding when
 * `mustChangePassword` is true on the session. The employee cannot reach the
 * dashboard until the temporary password is replaced.
 */
export const ForcedPasswordResetScreen: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Raw mode: the legacy exception filter emits { success, error }, which
      // the generic authFetch error handler does not surface, so parse here.
      const response = await authFetch<Response>('/api/auth/change-password', {
        method: 'POST',
        raw: true,
        body: { currentPassword, newPassword },
      });

      let payload: { success?: boolean; message?: string; error?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        /* non-JSON body */
      }

      if (response.ok && payload?.success) {
        // Reload so the session bootstrap re-reads mustChangePassword=false.
        window.location.replace('/');
        return;
      }

      setError(payload?.error || payload?.message || `Password update failed (${response.status}).`);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-lg border border-[#D9E5EE] bg-[#F5F9FC] py-2.5 pl-10 pr-4 text-sm text-[#17324A] placeholder:text-[#7A8B99] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7FAFC] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F0F7]">
            <KeyRound className="h-6 w-6 text-[#17324A]" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-[#17324A]">Set a new password</h1>
          <p className="mt-1.5 text-sm text-[#5F7180]">
            For security, you must replace the temporary password shared by HR before you can access the portal.
          </p>
        </div>

        <div className="rounded-lg border border-[#D9E5EE] bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#B0D0EA] bg-[#EAF3F9] px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#315B76]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#315B76]">
              Use the temporary password from your HR welcome message as the <strong>current</strong> password, then choose a new one (minimum 8 characters).
            </p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="reset-current-password" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Current (temporary) password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="reset-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Enter your temporary password"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-new-password" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                New password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="reset-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Minimum 8 characters"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm-password" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Confirm new password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClassName}
                  placeholder="Re-enter your new password"
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#17324A] py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#234B68] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Updating password...
                </>
              ) : (
                'Update password & continue'
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-[#667085]">
          MYLOTIC GROUP HRMS · Your session is protected
        </p>
      </div>
    </div>
  );
};
