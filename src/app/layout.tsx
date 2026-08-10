import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HRMSProvider } from '@/context/HRMSContext';
import { MainLayoutWrapper } from '@/components/layout/MainLayoutWrapper';
import { MeetingsQueryProvider } from '@/components/providers/MeetingsQueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MYLOTIC GROUP PVT.LTD - HRMS Portal',
  description:
    'Streamlined HR management, employee self-service, leave tracking, payroll processing, and performance appraisals for MYLOTIC GROUP PVT.LTD.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased selection:bg-[#B0D0EA] selection:text-[#17324A]`}
      >
        <HRMSProvider>
          <MeetingsQueryProvider>
            <MainLayoutWrapper>{children}</MainLayoutWrapper>
          </MeetingsQueryProvider>
        </HRMSProvider>
      </body>
    </html>
  );
}

