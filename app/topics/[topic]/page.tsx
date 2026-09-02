import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { questionsForTopic, topics, topicSlug } from '@/lib/questions';
import { previewsForTopic } from '@/lib/preview';
import UpsellCard from '@/app/UpsellCard';

const PER_PAGE = 60;

export const revalidate = 86400;

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
    description: `MIFOTRA ICT exam practice questions on ${list[0].topic}, with verified answers and explanations in English and French.`,
    alternates: { canonical: `/topics/${slug}` },
  };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const slug = (await params).topic;
  const free = questionsForTopic(slug);
  if (!free.length) notFound();

  const topicName = free[0].topic;
  const page = Math.max(1, Number((await searchParams).page) || 1);

  // Paid previews give crawlers a path to the deep pages. Without a hub linking
  // to them they would be reachable only from the sitemap, which is not enough
  // to get thousands of pages indexed.
  const { items: paid, total } = await previewsForTopic(
    topicName,
    (page - 1) * PER_PAGE,
    PER_PAGE
  ).catch(() => ({ items: [], total: 0 }));

  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <>
      <p className="muted">
        <Link href="/topics">Topics</Link>
      </p>
      <h1>{topicName}</h1>
      <p className="lead" style={{ marginBottom: '1.2rem' }}>
        {free.length} free {free.length === 1 ? 'question' : 'questions'} with verified answers
        {total > 0 && `, and ${total.toLocaleString()} more in the full bank`}.
      </p>

      <h2>Free questions</h2>
      <div style={{ display: 'grid', gap: '.7rem', marginBottom: '2rem' }}>
        {free.map((q) => (
          <Link
            key={q.id}
            href={`/questions/${q.slug}`}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div>{q.en.stem}</div>
            <div className="muted" style={{ marginTop: '.35rem', fontSize: '.88rem' }}>
              {q.marks} {q.marks === 1 ? 'mark' : 'marks'} &middot; {q.difficulty}
            </div>
          </Link>
        ))}
      </div>

      {paid.length > 0 && (
        <>
          <h2>
            More {topicName} questions{lastPage > 1 && ` (page ${page} of ${lastPage})`}
          </h2>
          <p className="muted">Answers and explanations are in the full bank.</p>
          <ul className="qlist">
            {paid.map((q) => (
              <li key={q.slug}>
                <Link href={`/questions/${q.slug}`}>{q.en.stem}</Link>{' '}
                <span className="muted" style={{ fontSize: '.85rem' }}>
                  &middot; {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                </span>
              </li>
            ))}
          </ul>

          {lastPage > 1 && (
            <nav className="navrow" aria-label="Pagination">
              {page > 1 && (
                <Link
                  className="btn ghost"
                  href={`/topics/${slug}${page - 1 === 1 ? '' : `?page=${page - 1}`}`}
                >
                  Previous
                </Link>
              )}
              <span className="muted" style={{ alignSelf: 'center' }}>
                Page {page} of {lastPage}
              </span>
              {page < lastPage && (
                <Link className="btn ghost" href={`/topics/${slug}?page=${page + 1}`}>
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}

      <div style={{ marginTop: '2rem' }}>
        <UpsellCard variant="full" />
      </div>
    </>
  );
}
