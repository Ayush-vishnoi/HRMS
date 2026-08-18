import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HRMSProvider } from '@/shared/providers/HRMSContext';
import { MainLayoutWrapper } from '@/shared/components/layout/MainLayoutWrapper';
import { MeetingsQueryProvider } from '@/shared/providers/MeetingsQueryProvider';
import { getCurrentEmployee } from '@/lib/auth-session';

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
  const employee = await getCurrentEmployee();
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
          <MeetingsQueryProvider>
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </MeetingsQueryProvider>
        </HRMSProvider>
      </body>
    </html>
  );
}

