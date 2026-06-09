import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { getPublicSiteUrl } from '@/lib/site-url';

export const metadata: Metadata = {
  metadataBase: new URL(getPublicSiteUrl()),
  title: {
    default: 'Giftora | Thoughtful Gifts for Every Celebration',
    template: '%s | Giftora'
  },
  description: 'Discover premium curated gifts for birthdays, holidays, and milestones.',
  openGraph: {
    title: 'Giftora',
    description: 'Thoughtful gifts with premium design and easy checkout.',
    type: 'website'
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
