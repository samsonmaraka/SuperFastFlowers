import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getPublicSiteUrl } from '@/lib/site-url';
import { AuthSessionProvider } from '@/components/auth-session-provider';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  applicationName: 'Sendagift UG',
  title: {
    default: 'Sendagift UG | Send Gifts, Cakes, Flowers & Hampers in Uganda',
    template: '%s | Sendagift UG'
  },
  description: 'Sendagift UG helps you send cakes, flowers, cupcakes, hampers, and thoughtful gifts in Uganda. Order online for birthdays, love, baby showers, get well, and special occasions.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Sendagift UG',
    description: 'Send cakes, flowers, cupcakes, hampers, and thoughtful gifts in Uganda for birthdays, love, baby showers, get well, and special occasions.',
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
        <AuthSessionProvider>
          <Navbar />
          <main className="min-h-[80vh]">{children}</main>
          <Footer />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
