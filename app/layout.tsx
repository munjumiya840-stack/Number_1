import './globals.css';
import type { Metadata } from 'next';
import { Orbitron, Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/lib/auth-context';
import { TelegramAutoLogin } from '@/components/auth/telegram-auto-login';

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GLOBAL NUMBER — Premium Virtual Numbers & OTP Service',
  description:
    'Get instant OTP codes with virtual phone numbers from over 190 countries. Fast, reliable, and secure OTP delivery for Facebook, WhatsApp, Instagram, and more.',
  openGraph: {
    title: 'GLOBAL NUMBER — Premium Virtual Numbers & OTP Service',
    description:
      'Get instant OTP codes with virtual phone numbers from over 190 countries.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${orbitron.variable} ${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <TelegramAutoLogin />
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
