import type { Metadata } from 'next';
import { Baskervville, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import HeraldryDefs from './components/HeraldryDefs';
import TopNav from './components/TopNav';

// Self-hosted at build time (Next.js bakes the font files into the app) — no
// runtime request to Google's CDN, so visitor IPs are never sent to Google
// just to load the page.
const baskervville = Baskervville({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const ibmPlexMono = IBM_Plex_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});
const publicSans = Public_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ozzy · Civic Intelligence Prototype for Birmingham',
  description: 'Ask Ozzy — an open-source civic intelligence prototype for Birmingham. Explore selected public data, see patterns and ask what they might mean.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baskervville.variable} ${ibmPlexMono.variable} ${publicSans.variable}`}>
      <body>
        <HeraldryDefs />
        <TopNav />
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
