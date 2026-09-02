import Link from 'next/link';
import { freeQuestions, mifotraQuestions, topics, topicSlug } from '@/lib/questions';
import UpsellCard from './UpsellCard';

export default function Home() {
  const marks = mifotraQuestions.reduce((a, q) => a + q.marks, 0);

  return (
    <>
      <section style={{ padding: '2rem 0 1rem' }}>
        <span className="pill">Rwanda &middot; Public Service ICT</span>
        <h1 style={{ marginTop: '.7rem' }}>
          Practise the real MIFOTRA ICT exam, in English and French.
        </h1>
        <p className="lead">
          The full {mifotraQuestions.length}-question Centralized ICT Acquisition Officer past
          paper, every answer independently verified and explained. Free to practise, no account
          needed.
        </p>
        <div className="navrow">
          <Link className="btn" href="/exam">Start the past paper</Link>
          <Link className="btn ghost" href="/practice">Quick 20-question drill</Link>
        </div>
      </section>

      <section className="card grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat"><b>{mifotraQuestions.length}</b><span>Past-paper questions</span></div>
        <div className="stat"><b>{marks}</b><span>Total marks</span></div>
        <div className="stat"><b>{freeQuestions.length}</b><span>Free questions</span></div>
        <div className="stat"><b>2</b><span>Languages</span></div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h2>Why the answers here differ from what you may have seen</h2>
        <div className="card">
          <p style={{ marginTop: 0 }}>
            This past paper was recovered from a real exam session, and the highlighted choices
            in that session were the candidate&rsquo;s own &mdash; not an answer key. Seventeen of
            them were wrong. Every question here has been re-checked and corrected, so
            &ldquo;Which of the following is a Linux distribution?&rdquo; answers{' '}
            <strong>Ubuntu</strong>, not macOS, and the malware that disguises itself as
            legitimate software is a <strong>Trojan</strong>, not a virus.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <UpsellCard variant="full" />
      </section>

      <section>
        <h2>Browse by topic</h2>
        <div className="grid">
          {topics.map((t) => {
            const n = freeQuestions.filter((q) => q.topic === t).length;
            return (
              <Link key={t} href={`/topics/${topicSlug(t)}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{t}</strong>
                <div className="muted">{n} free {n === 1 ? 'question' : 'questions'}</div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
