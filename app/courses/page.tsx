import type { Metadata } from 'next';
import Link from 'next/link';
import { COURSES, freeQuestionsFor } from '@/lib/courses';
import { topicCounts } from '@/lib/preview';
import UpsellCard from '@/app/UpsellCard';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Courses',
  description:
    'Practice courses for Rwandan technical and ICT exams: MIFOTRA past papers, CompTIA Security+, Network+, A+, Cisco CCNA, fibre optics and electrical systems.',
  alternates: { canonical: '/courses' },
};

export default async function CoursesPage() {
  const counts = await topicCounts().catch(() => ({}) as Record<string, number>);
  const totalPaid = Object.values(counts).reduce((a, b) => a + b, 0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: COURSES.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/courses/${c.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <h1>Courses</h1>
      <p className="lead" style={{ marginBottom: '1.4rem' }}>
        Every course here is MIFOTRA exam preparation, drawn from the same{' '}
        {(2446).toLocaleString()}-question bank and filtered to one area. Fifty of those
        questions are the real past paper; the rest are practice written to the published
        objectives the exam draws on.
      </p>

      <div className="grid" style={{ marginBottom: '2rem' }}>
        {COURSES.map((c) => {
          const free = freeQuestionsFor(c).length;
          return (
            <Link
              key={c.slug}
              href={`/courses/${c.slug}`}
              className="card course-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              {c.slug === 'mifotra-ict-officer' && (
                <span className="badge-real" style={{ marginBottom: '.5rem', display: 'inline-block' }}>
                  Real past paper
                </span>
              )}
              <strong style={{ display: 'block', fontSize: '1.05rem' }}>{c.name}</strong>
              <p className="muted" style={{ margin: '.35rem 0 .6rem' }}>
                {c.blurb}
              </p>
              <span className="muted" style={{ fontSize: '.86rem' }}>
                {free} free {free === 1 ? 'question' : 'questions'} &middot; {c.examLength}-question
                practice exam
              </span>
            </Link>
          );
        })}
      </div>

      <p className="muted">
        {totalPaid > 0 &&
          `A further ${totalPaid.toLocaleString()} questions are in the paid banks, spread across every course.`}
      </p>

      <UpsellCard variant="full" />
    </>
  );
}
