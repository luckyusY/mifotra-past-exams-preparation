import type { Metadata } from 'next';
import Link from 'next/link';
import { freeQuestions, topics, topicSlug } from '@/lib/questions';

export const metadata: Metadata = {
  title: 'Topics',
  description: 'Browse MIFOTRA ICT exam practice questions by topic.',
};

export default function TopicsPage() {
  return (
    <>
      <h1>Topics</h1>
      <p className="lead" style={{ marginBottom: '1.2rem' }}>
        {freeQuestions.length} free questions across {topics.length} topics.
      </p>
      <div className="grid">
        {topics.map((t) => {
          const n = freeQuestions.filter((q) => q.topic === t).length;
          return (
            <Link key={t} href={`/topics/${topicSlug(t)}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong>{t}</strong>
              <div className="muted">{n} {n === 1 ? 'question' : 'questions'}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
