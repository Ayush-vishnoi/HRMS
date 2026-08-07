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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased selection:bg-[#8B3A4A] selection:text-white`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('hrms_theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
        <HRMSProvider>
          <MainLayoutWrapper>{children}</MainLayoutWrapper>
        </HRMSProvider>
      </body>
    </html>
  );
}

