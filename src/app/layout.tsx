import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HRMSProvider } from '@/shared/providers/HRMSContext';
import { MainLayoutWrapper } from '@/shared/components/layout/MainLayoutWrapper';
import { MeetingsQueryProvider } from '@/shared/providers/MeetingsQueryProvider';
import { getCurrentEmployee } from '@/lib/auth-session';

import { ChatProvider } from '@/shared/providers/ChatContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MYLOTIC GROUP PVT.LTD - HRMS Portal',
  description:
    'Streamlined HR management, employee self-service, leave tracking, payroll processing, and performance appraisals for MYLOTIC GROUP PVT.LTD.',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/icon.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Authentication depends on the remote database. A temporary database outage
  // must not prevent the public/login shell from rendering.
  const employee = await getCurrentEmployee().catch((error: unknown) => {
    console.error('Unable to initialize the authenticated layout:', error);
    return null;
  });
  const initialUser = employee
    ? {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.roleTitle,
        userRole: employee.userRole,
        department: employee.department,
        avatar: employee.avatarUrl ?? '',
        employeeCode: employee.employeeCode,
      }
    : null;

  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased selection:bg-[#B0D0EA] selection:text-[#17324A]`}
      >
        <HRMSProvider
          initialUser={initialUser}
        >
          <ChatProvider>
            <MeetingsQueryProvider>
              <MainLayoutWrapper>{children}</MainLayoutWrapper>
            </MeetingsQueryProvider>
          </ChatProvider>
        </HRMSProvider>
      </body>
    </html>
  );
}

