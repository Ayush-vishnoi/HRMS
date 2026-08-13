import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HRMSProvider } from '@/shared/providers/HRMSContext';
import { MainLayoutWrapper } from '@/shared/components/layout/MainLayoutWrapper';
import { MeetingsQueryProvider } from '@/shared/providers/MeetingsQueryProvider';

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

