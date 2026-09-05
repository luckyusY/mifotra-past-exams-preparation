import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { WHATSAPP_DISPLAY, whatsappLink } from './Contact';
import WhatsAppBubble from './WhatsAppBubble';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Google shows the token three different ways - a bare string in the HTML-tag
 * method, `google-site-verification=TOKEN` in the DNS method, and wrapped in a
 * full <meta> tag when you copy the snippet. Accept all three and emit the bare
 * token, because pasting the wrong one renders a tag Google silently rejects.
 */
function verificationToken(): string | undefined {
  const raw = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!raw) return undefined;
  const fromMeta = raw.match(/content=["']([^"']+)["']/i)?.[1];
  return (fromMeta ?? raw).replace(/^google-site-verification=/i, '').trim() || undefined;
}

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: 'MIFOTRA Past Exams Preparation | Rwanda Public Service ICT',
    template: '%s | MIFOTRA Past Exams Preparation',
  },
  description:
    'Free bilingual practice for the MIFOTRA Centralized ICT Acquisition Officer exam in Rwanda. Real past-paper questions with verified answers and explanations in English and French.',
  keywords: [
    'MIFOTRA past papers', 'MIFOTRA exam', 'ibizamini bya MIFOTRA',
    'Rwanda public service exam', 'Rwanda ICT officer exam',
    'examen fonction publique Rwanda', 'MIFOTRA questions and answers',
  ],
  openGraph: { type: 'website', locale: 'en_RW', siteName: 'MIFOTRA Past Exams Preparation' },
  alternates: { languages: { en: '/', fr: '/' } },
  // Search Console verification. Set GOOGLE_SITE_VERIFICATION to the content
  // value from the "HTML tag" method; the tag only renders once it is set.
  verification: verificationToken() ? { google: verificationToken() } : undefined,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="wrap">
            {/* Original wordmark. Deliberately not the MIFOTRA state crest: this is an
                independent commercial study site and must not imply a government
                endorsement it does not have. */}
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden="true">PE</span>
              <span className="brand-text">
                <b>Past Exams</b>
                <span>Rwanda ICT preparation</span>
              </span>
            </Link>
            <nav>
              <Link href="/courses">Courses</Link>
              <Link href="/exam">Past paper</Link>
              <Link href="/topics">Topics</Link>
              <Link href="/blog">Guides</Link>
              <Link href="/unlock" className="nav-cta">Unlock full bank</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <WhatsAppBubble />
        <footer>
          <div className="wrap">
            <p>
              Independent study resource for candidates sitting Rwandan public-service ICT
              recruitment exams. Not affiliated with MIFOTRA, CompTIA or Cisco.
            </p>
            <p className="muted">
              The MIFOTRA past paper is reproduced for study. All other questions are
              original practice written against publicly published exam objectives, and are
              labelled as such on every page.
            </p>
            <p>
              Questions about payment or access:{' '}
              <a href={whatsappLink('Hello, I have a question about the MIFOTRA question bank.')} target="_blank" rel="noopener noreferrer">
                WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
