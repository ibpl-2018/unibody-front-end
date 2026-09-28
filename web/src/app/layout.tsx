import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import { ThemeProvider, themeInitScript } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/toast';
import { SITE_URL } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Unibody — Genuine & tested parts for MacBook, iMac, iPhone and iPad', template: '%s · Unibody' },
  description: 'Displays, keyboards, batteries and logic boards for MacBook Air, MacBook Pro, iMac, iPhone and iPad — 2012 to today. Tested before dispatch. Cash on Delivery. Delivered in 1–3 days.',
  applicationName: 'Unibody',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
