'use client';

import React from 'react';
import { useHRMS } from '@/context/HRMSContext';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/components/auth/LoginPage';

export const MainLayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useHRMS();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
