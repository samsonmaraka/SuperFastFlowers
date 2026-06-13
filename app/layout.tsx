import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getPublicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  applicationName: 'Sendagift UG',
  title: {
    default: 'Sendagift UG | Thoughtful Gifts for Every Celebration',
    template: '%s | Sendagift UG'
  },
  description: 'Discover premium curated gifts for birthdays, holidays, and milestones.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Sendagift UG',
    description: 'Thoughtful gifts with premium design and easy checkout.',
    url: '/',
    siteName: 'Sendagift UG',
    type: 'website'
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' }
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '192x192' }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-[80vh]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
