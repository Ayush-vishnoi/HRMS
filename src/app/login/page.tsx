'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHRMS } from '@/shared/providers/HRMSContext';

/**
 * /login route target for auth redirects (api-client 401 handling, logout).
 *
 * Unauthenticated visitors never see this page: MainLayoutWrapper renders
 * the full-screen LoginPage in place of children and redirects any
 * non-`/` pathname back to `/`. Authenticated users landing here are
 * sent to the dashboard.
 */
export default function LoginRoutePage() {
  const { isAuthenticated, isAuthReady } = useHRMS();
  const router = useRouter();

  useEffect(() => {
    if (isAuthReady && isAuthenticated) router.replace('/');
  }, [isAuthReady, isAuthenticated, router]);

  return null;
}
