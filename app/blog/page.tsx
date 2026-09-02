import type { Metadata } from 'next';
import Link from 'next/link';
import { publishedPosts } from '@/lib/posts';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'MIFOTRA exam guides',
  description:
    'Study guides for Rwandan public-service ICT recruitment exams: what is tested, how the marks work, and how to prepare.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndex() {
  let posts: Awaited<ReturnType<typeof publishedPosts>> = [];
  try {
    posts = await publishedPosts();
  } catch {
    // Database unavailable: render the page rather than 500ing the whole route.
  }

  return (
    <>
      <h1>Exam guides</h1>
      <p className="lead" style={{ marginBottom: '1.4rem' }}>
        Preparation notes for Rwandan public-service ICT recruitment exams.
      </p>

      {posts.length === 0 ? (
        <div className="notice">No guides published yet.</div>
      ) : (
        <div style={{ display: 'grid', gap: '.8rem' }}>
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <strong style={{ fontSize: '1.05rem' }}>{p.title}</strong>
              <div className="muted" style={{ marginTop: '.3rem' }}>
                {p.metaDescription}
              </div>
              {p.publishedAt && (
                <div className="muted" style={{ marginTop: '.4rem', fontSize: '.84rem' }}>
                  {new Date(p.publishedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
