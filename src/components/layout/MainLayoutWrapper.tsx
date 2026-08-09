'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useHRMS } from '@/context/HRMSContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/components/auth/LoginPage';
import { ClockInPermissionModal } from '@/components/modals/ClockInPermissionModal';

export const MainLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isAuthReady, currentUser, isClockedIn, lateClockInRequest, toggleClockIn } = useHRMS();
  const [isPermissionModalOpen, setIsPermissionModalOpen] = React.useState(false);
  const [notice, setNotice] = React.useState('');

  const handleClockAction = () => {
    const result = toggleClockIn();
    if (result.status === 'permission-required') {
      setIsPermissionModalOpen(true);
    } else if (result.status === 'permission-pending') {
      setNotice('Your late clock-in request is pending HR approval.');
    }
  };

  React.useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  React.useEffect(() => {
    if (isAuthReady && !isAuthenticated && pathname !== '/') {
      router.replace('/');
    }
  }, [isAuthReady, isAuthenticated, pathname, router]);

  if (!isAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app">
        <div className="rounded-xl border border-[#D9E5EE] bg-white px-5 py-3 text-sm font-semibold text-[#315B76] shadow-sm">
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col">
        <Header onClockAction={handleClockAction} />
        <main className="flex-1 overflow-y-auto bg-app p-6 md:p-8">{children}</main>
      </div>
      {currentUser.userRole === 'employee' && !isClockedIn && lateClockInRequest?.status === 'pending' && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 shadow-lg">
          Late clock-in permission is pending HR approval.
        </div>
      )}
      {notice && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-[#D9E5EE] bg-white px-4 py-3 text-xs font-semibold text-[#17324A] shadow-lg">{notice}</div>}
      <ClockInPermissionModal isOpen={isPermissionModalOpen} onClose={() => setIsPermissionModalOpen(false)} />
    </div>
  );
};
