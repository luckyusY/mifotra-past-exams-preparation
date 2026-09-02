import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

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
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
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
              <Link href="/exam">Past paper</Link>
              <Link href="/practice">Practice</Link>
              <Link href="/topics">Topics</Link>
              <Link href="/blog">Guides</Link>
              <Link href="/unlock">Unlock full bank</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer>
          <div className="wrap">
            <p>
              Independent study resource for candidates sitting Rwandan public-service ICT
              recruitment exams. Not affiliated with MIFOTRA, CompTIA or Cisco.
            </p>
            <p className="muted">
              Practice questions are original, written against publicly published exam
              objectives. Past-paper items are reproduced for study purposes.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
