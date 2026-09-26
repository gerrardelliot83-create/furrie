import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { ToastProvider } from '@/components/ui/Toast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Furrie - Veterinary Teleconsultation',
    template: '%s | Furrie',
  },
  description:
    'Book a video consultation with a vet for your dog or cat.',
  keywords: ['veterinary', 'pet care', 'teleconsultation', 'dog', 'cat', 'vet', 'online vet', 'pet health', 'India'],
  authors: [{ name: 'Furrie' }],
  creator: 'Furrie',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Label under the home-screen icon on iPhone (otherwise it uses the page title).
  appleWebApp: {
    title: 'Furrie',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Furrie',
    title: 'Furrie - Veterinary Teleconsultation',
    description: 'Book a video consultation with a vet for your dog or cat, from anywhere in India.',
    url: 'https://furrie.in',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Furrie - Veterinary Teleconsultation',
    description: 'Book a video consultation with a vet for your dog or cat.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#010f3a', // Navy (--color-navy); must match theme_color in public/manifest.json
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
        {/* Real-user Web Vitals. Gerard enabled Speed Insights on Vercel on
            2026-09-14; the component is what actually collects the data. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
