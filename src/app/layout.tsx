import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { HRMSProvider } from '@/context/HRMSContext';
import { MainLayoutWrapper } from '@/components/layout/MainLayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Apex HRMS - Enterprise Human Resource Portal',
  description: 'Streamlined HR management, employee self-service, leave tracking, payroll processing, and performance appraisals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white`}>
        <HRMSProvider>
          <MainLayoutWrapper>{children}</MainLayoutWrapper>
        </HRMSProvider>
      </body>
    </html>
  );
}
