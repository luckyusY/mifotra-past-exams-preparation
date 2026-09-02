import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { postBySlug, relatedPosts } from '@/lib/posts';
import UpsellCard from '@/app/UpsellCard';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = await postBySlug((await params).slug).catch(() => null);
  if (!post) return {};
  return {
    title: post.title,
    description: post.metaDescription,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.metaDescription,
      publishedTime: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const post = await postBySlug((await params).slug).catch(() => null);
  if (!post) notFound();

  const related = await relatedPosts(post).catch(() => []);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  // Article plus FAQPage: the FAQ block is what tends to win rich results.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.metaDescription,
      datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      inLanguage: 'en',
      mainEntityOfPage: `${site}/blog/${post.slug}`,
      publisher: { '@type': 'Organization', name: 'MIFOTRA Past Exams Preparation' },
    },
    post.faq.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: post.faq.map((f) => ({
            '@type': 'Question',
            name: f.question,
            acceptedAnswer: { '@type': 'Answer', text: f.answer },
          })),
        }
      : null,
  ].filter(Boolean);

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="muted" style={{ marginBottom: '.4rem' }}>
        <Link href="/blog">Exam guides</Link>
      </p>

      <h1>{post.title}</h1>
      {post.publishedAt && (
        <p className="muted">
          {new Date(post.publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      )}

      <p className="lead" style={{ margin: '1rem 0 1.6rem' }}>
        {post.intro}
      </p>

      {post.sections.map((s, i) => (
        <section key={i} style={{ marginBottom: '1.6rem' }}>
          <h2>{s.heading}</h2>
          {s.paragraphs.map((p, j) => (
            <p key={j}>{p}</p>
          ))}
          {s.bullets && s.bullets.length > 0 && (
            <ul>
              {s.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
          {i === 1 && <UpsellCard variant="inline" />}
        </section>
      ))}

      {post.faq.length > 0 && (
        <section style={{ marginBottom: '1.6rem' }}>
          <h2>Common questions</h2>
          {post.faq.map((f, i) => (
            <div className="card" key={i} style={{ marginBottom: '.7rem' }}>
              <strong>{f.question}</strong>
              <p style={{ marginBottom: 0 }}>{f.answer}</p>
            </div>
          ))}
        </section>
      )}

      {post.links && (post.links.topicHref || post.links.questions.length > 0) && (
        <section style={{ marginBottom: '1.6rem' }}>
          <h2>Practise this</h2>
          {post.links.topicHref && (
            <p>
              <Link href={post.links.topicHref}>
                All {post.entity} questions
              </Link>
            </p>
          )}
          <ul>
            {post.links.questions.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section style={{ marginBottom: '1.6rem' }}>
          <h2>Related guides</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/blog/${r.slug}`}>{r.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <UpsellCard variant="full" />
    </article>
  );
}
