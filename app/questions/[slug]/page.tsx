import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { freeQuestions, questionBySlug, topicSlug } from '@/lib/questions';

const LETTERS = ['A', 'B', 'C', 'D'];

// Every free question becomes a static, crawlable page. This is the surface that
// search engines and AI assistants actually read.
export function generateStaticParams() {
  return freeQuestions.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const q = questionBySlug((await params).slug);
  if (!q) return {};
  return {
    title: q.en.stem.slice(0, 65),
    description: `${q.en.stem} Answer: ${q.en.options[q.answerIndex]}. ${q.en.explanation}`.slice(0, 300),
    alternates: { canonical: `/questions/${q.slug}` },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const q = questionBySlug((await params).slug);
  if (!q) notFound();

  // Schema.org Question markup makes the answer eligible for rich results and
  // easy for AI crawlers to attribute.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: q.en.stem,
      text: q.en.stem,
      answerCount: 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `${q.en.options[q.answerIndex]}. ${q.en.explanation}`,
      },
      suggestedAnswer: q.en.options
        .filter((_, i) => i !== q.answerIndex)
        .map((o) => ({ '@type': 'Answer', text: o })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="muted" style={{ marginBottom: '.4rem' }}>
        <Link href="/topics">Topics</Link> / <Link href={`/topics/${topicSlug(q.topic)}`}>{q.topic}</Link>
      </p>

      <h1 style={{ fontSize: '1.5rem' }}>{q.en.stem}</h1>
      {q.fr && <p className="lead">{q.fr.stem}</p>}

      <div className="card" style={{ margin: '1.2rem 0' }}>
        <div className="lbl muted">Answers</div>
        {q.en.options.map((opt, i) => (
          <div key={i} className={'opt ' + (i === q.answerIndex ? 'correct' : '')}>
            <span className="letter">{LETTERS[i]}</span>
            <span className="dot"><i /></span>
            <span className="txt">
              <span>{opt}</span>
              {q.fr && <span className="fr">{q.fr.options[i]}</span>}
            </span>
          </div>
        ))}
        <div className="explain">
          <b>Correct answer: {LETTERS[q.answerIndex]} &mdash; {q.en.options[q.answerIndex]}</b>
          <div>{q.en.explanation}</div>
          {q.fr && <div className="muted" style={{ marginTop: '.4rem' }}>{q.fr.explanation}</div>}
        </div>
      </div>

      <p className="muted">
        {q.examSource}
        {q.examNumber ? ` \u00b7 Question ${q.examNumber}` : ''} &middot; {q.marks}{' '}
        {q.marks === 1 ? 'mark' : 'marks'} &middot; {q.difficulty}
      </p>

      <div className="navrow">
        <Link className="btn" href="/exam">Practise the full past paper</Link>
        <Link className="btn ghost" href="/unlock">Unlock all 2,446 questions</Link>
      </div>
    </>
  );
}
