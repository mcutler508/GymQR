import type { Metadata, Viewport } from 'next';
import './globals.css';
import { allFontVariables, inter } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'RepetoIQ — Your gym remembers your lifts',
  description: 'Scan equipment, see your last lift, log a new set.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={allFontVariables}>
      <body className={`${inter.className} antialiased min-h-screen`}>{children}</body>
    </html>
  );
}
