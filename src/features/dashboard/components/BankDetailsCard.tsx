'use client';

import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Landmark, LoaderCircle, PencilLine, ShieldCheck } from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { useHRMS } from '@/shared/providers/HRMSContext';

interface BankDetailsRecord {
  account_number?: string | null;
  ifsc_code?: string | null;
  bank_name?: string | null;
  account_holder_name?: string | null;
  status?: string | null;
}

const EMPTY_FORM = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
};

/**
 * Onboarding STEP 4b — salary account collection card for the employee
 * dashboard. Shown while the bank record is Pending (form) or Submitted
 * (awaiting HR verification); hides itself once Verified.
 */
export const BankDetailsCard: React.FC = () => {
  const { currentUser } = useHRMS();
  const [record, setRecord] = useState<BankDetailsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    authFetch<{ success?: boolean; data?: BankDetailsRecord | null }>('/api/employee-lifecycle/bank-details')
      .then((res) => {
        if (cancelled) return;
        // Interceptor wraps as { success, data }; an absent record is
        // { success: true, data: null } — only show the card when a real
        // record exists (created during onboarding STEP 4b).
        const payload = res as any;
        const data = payload && typeof payload === 'object' && 'data' in payload
          ? payload.data
          : payload;
        if (data && typeof data === 'object') {
          setRecord(data);
        }
      })
      .catch(() => {
        /* keep defaults — card simply stays hidden on load errors */
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id]);

  // Hidden while loading, when no record exists, or once HR has verified.
  if (isLoading || !record || record.status === 'Verified') return null;

  const status = record?.status ?? 'Pending';

  const startEditing = () => {
    setForm({
      accountHolderName: record?.account_holder_name ?? currentUser.name,
      bankName: record?.bank_name ?? '',
      accountNumber: record?.account_number ?? '',
      ifscCode: record?.ifsc_code ?? '',
    });
    setError('');
    setIsEditing(true);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!form.accountHolderName.trim() || !form.bankName.trim() || !form.accountNumber.trim() || !form.ifscCode.trim()) {
      setError('All fields are required.');
      return;
    }
    if (!/^\d{9,18}$/.test(form.accountNumber.trim())) {
      setError('Account number must be 9-18 digits.');
      return;
    }
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(form.ifscCode.trim())) {
      setError('Invalid IFSC code format (expected e.g. HDFC0001234).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Raw mode: the legacy exception filter emits { success, error }, which
      // the generic authFetch error handler does not surface, so parse here.
      const response = await authFetch<Response>('/api/employee-lifecycle/bank-details', {
        method: 'POST',
        raw: true,
        body: {
          accountHolderName: form.accountHolderName.trim(),
          bankName: form.bankName.trim(),
          accountNumber: form.accountNumber.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
        },
      });

      let payload: { success?: boolean; data?: BankDetailsRecord; error?: string; message?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        /* non-JSON body */
      }

      if (response.ok && payload?.success) {
        const data = payload.data ?? (payload as any);
        setRecord(data);
        setIsEditing(false);
        return;
      }

      setError(payload?.error || payload?.message || `Submission failed (${response.status}).`);
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-lg border border-[#D9E5EE] bg-[#F5F9FC] px-3.5 py-2.5 text-sm text-[#17324A] placeholder:text-[#7A8B99] focus:border-[#17324A] focus:outline-none focus:ring-2 focus:ring-[#B0D0EA]';

  return (
    <section className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#D9E5EE] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#17324A]">
          <Landmark className="h-4 w-4 text-[#17324A]" aria-hidden="true" />
          Bank Details for Salary Credit
        </h3>

        <span
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
            status === 'Submitted'
              ? 'bg-[#9e6a03]/10 text-[#9e6a03] border border-[#9e6a03]/20'
              : 'bg-[#da3633]/10 text-[#da3633] border border-[#da3633]/20'
          }`}
        >
          {status === 'Submitted' ? 'Submitted · Pending HR Verification' : 'Action Required'}
        </span>
      </div>

      {!isEditing && status === 'Submitted' ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-[#B0D0EA] bg-[#EAF3F9] px-3.5 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#315B76]" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-[#315B76]">
              Your bank details have been submitted and are awaiting verification by HR. You will be notified once they are approved for payroll.
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[#D9E5EE] bg-[#F7FAFC] px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5F7180]">Account Holder</dt>
              <dd className="mt-0.5 text-xs font-semibold text-[#17324A]">{record?.account_holder_name || '—'}</dd>
            </div>
            <div className="rounded-lg border border-[#D9E5EE] bg-[#F7FAFC] px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5F7180]">Bank</dt>
              <dd className="mt-0.5 text-xs font-semibold text-[#17324A]">{record?.bank_name || '—'}</dd>
            </div>
            <div className="rounded-lg border border-[#D9E5EE] bg-[#F7FAFC] px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5F7180]">Account Number</dt>
              <dd className="mt-0.5 font-mono text-xs font-semibold text-[#17324A]">
                {record?.account_number ? `•••• •••• ${record.account_number.slice(-4)}` : '—'}
              </dd>
            </div>
            <div className="rounded-lg border border-[#D9E5EE] bg-[#F7FAFC] px-3.5 py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-[#5F7180]">IFSC Code</dt>
              <dd className="mt-0.5 font-mono text-xs font-semibold text-[#17324A]">{record?.ifsc_code || '—'}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D9E5EE] bg-white px-4 py-2 text-xs font-semibold text-[#17324A] transition-colors hover:bg-[#F5F9FC]"
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Details
          </button>
        </div>
      ) : (
        <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <p className="text-xs leading-relaxed text-[#5F7180]">
            Add the salary account where your monthly payroll should be credited. These details are verified by HR before the first payout.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="bank-holder-name" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Account holder name
              </label>
              <div className="relative">
                <CheckCircle2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="bank-holder-name"
                  type="text"
                  value={form.accountHolderName}
                  onChange={(event) => setForm((prev) => ({ ...prev, accountHolderName: event.target.value }))}
                  className={`${inputClassName} pl-10`}
                  placeholder="Name as per bank record"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="bank-name" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Bank name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5F7180]" aria-hidden="true" />
                <input
                  id="bank-name"
                  type="text"
                  value={form.bankName}
                  onChange={(event) => setForm((prev) => ({ ...prev, bankName: event.target.value }))}
                  className={`${inputClassName} pl-10`}
                  placeholder="e.g. HDFC Bank"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="bank-account-number" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                Account number
              </label>
              <input
                id="bank-account-number"
                type="text"
                inputMode="numeric"
                value={form.accountNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value.replace(/[^\d]/g, '') }))}
                className={inputClassName}
                placeholder="9-18 digits"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <label htmlFor="bank-ifsc" className="mb-1.5 block text-xs font-medium text-[#17324A]">
                IFSC code
              </label>
              <input
                id="bank-ifsc"
                type="text"
                value={form.ifscCode}
                onChange={(event) => setForm((prev) => ({ ...prev, ifscCode: event.target.value.toUpperCase() }))}
                className={`${inputClassName} font-mono uppercase`}
                placeholder="e.g. HDFC0001234"
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#17324A] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#234B68] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                'Submit for Verification'
              )}
            </button>

            {status === 'Submitted' && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2.5 text-xs font-semibold text-[#5F7180] transition-colors hover:text-[#17324A] disabled:opacity-60"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
};
