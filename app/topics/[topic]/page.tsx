import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { questionsForTopic, topics, topicSlug } from '@/lib/questions';

export function generateStaticParams() {
  return topics.map((t) => ({ topic: topicSlug(t) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const slug = (await params).topic;
  const list = questionsForTopic(slug);
  if (!list.length) return {};
  return {
    title: `${list[0].topic} questions`,
    description: `${list.length} MIFOTRA ICT exam practice questions on ${list[0].topic}, with verified answers and explanations in English and French.`,
    alternates: { canonical: `/topics/${slug}` },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const slug = (await params).topic;
  const list = questionsForTopic(slug);
  if (!list.length) notFound();

  return (
    <>
      <p className="muted"><Link href="/topics">Topics</Link></p>
      <h1>{list[0].topic}</h1>
      <p className="lead" style={{ marginBottom: '1.2rem' }}>
        {list.length} free {list.length === 1 ? 'question' : 'questions'} with verified answers.
      </p>
      <div style={{ display: 'grid', gap: '.7rem' }}>
        {list.map((q) => (
          <Link key={q.id} href={`/questions/${q.slug}`} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div>{q.en.stem}</div>
            <div className="muted" style={{ marginTop: '.35rem', fontSize: '.88rem' }}>
              {q.marks} {q.marks === 1 ? 'mark' : 'marks'} &middot; {q.difficulty}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
