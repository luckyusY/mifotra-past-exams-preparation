import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { freeQuestions, questionBySlug, topicSlug } from '@/lib/questions';
import { previewBySlug, relatedPreviews, type QuestionPreview } from '@/lib/preview';
import UpsellCard from '@/app/UpsellCard';
import Provenance from '@/app/Provenance';
import { coursesForQuestion } from '@/lib/courses';

const LETTERS = ['A', 'B', 'C', 'D'];

export const revalidate = 86400;
// Free questions are prerendered; paid previews render on demand and are cached.
export const dynamicParams = true;

export function generateStaticParams() {
  return freeQuestions.map((q) => ({ slug: q.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = (await params).slug;

  const free = questionBySlug(slug);
  if (free) {
    const description =
      free.answerIndex === null
        ? `${free.en.stem} MIFOTRA exam practice question with four options. ${free.en.explanation}`
        : `${free.en.stem} Answer: ${free.en.options[free.answerIndex]}. ${free.en.explanation}`;
    return {
      title: free.en.stem.slice(0, 65),
      description: description.slice(0, 300),
      alternates: { canonical: `/questions/${free.slug}` },
    };
  }

  const paid = await previewBySlug(slug).catch(() => null);
  if (!paid) return {};

  // The description must describe what the page actually shows. Promising an
  // answer the page does not display is the kind of mismatch that gets pages
  // demoted, quite apart from being untrue.
  return {
    title: paid.en.stem.slice(0, 65),
    description:
      `${paid.en.stem} Practice question on ${paid.topic} for Rwandan public service ICT exams, with four answer options.`.slice(
        0,
        300
      ),
    alternates: { canonical: `/questions/${paid.slug}` },
  };
}

export default async function QuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug;
  const free = questionBySlug(slug);

  if (free) {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const courses = coursesForQuestion(free);
    const jsonLd = [{
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Topics', item: `${site}/topics` },
        { '@type': 'ListItem', position: 2, name: free.topic, item: `${site}/topics/${topicSlug(free.topic)}` },
        { '@type': 'ListItem', position: 3, name: free.en.stem.slice(0, 70), item: `${site}/questions/${free.slug}` },
      ],
    }, {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: free.en.stem,
        text: free.en.stem,
        // Without a published answer there is no acceptedAnswer to declare.
        answerCount: free.answerIndex === null ? 0 : 1,
        ...(free.answerIndex === null
          ? {}
          : {
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${free.en.options[free.answerIndex]}. ${free.en.explanation}`,
              },
            }),
        suggestedAnswer: free.en.options
          .filter((_, i) => i !== free.answerIndex)
          .map((o) => ({ '@type': 'Answer', text: o })),
      },
    }];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <p className="muted" style={{ marginBottom: '.4rem' }}>
          <Link href="/topics">Topics</Link> /{' '}
          <Link href={`/topics/${topicSlug(free.topic)}`}>{free.topic}</Link>
        </p>

        <h1 style={{ fontSize: '1.5rem' }}>{free.en.stem}</h1>
        {free.fr && <p className="lead">{free.fr.stem}</p>}

        <div className="card" style={{ margin: '1.2rem 0' }}>
          <div className="lbl muted">Answers</div>
          {free.en.options.map((opt, i) => (
            <div key={i} className={'opt ' + (i === free.answerIndex ? 'correct' : '')}>
              <span className="letter">{LETTERS[i]}</span>
              <span className="dot">
                <i />
              </span>
              <span className="txt">
                <span>{opt}</span>
                {free.fr && <span className="fr">{free.fr.options[i]}</span>}
              </span>
            </div>
          ))}
          <div className="explain">
            <b>
              {free.answerIndex === null
                ? 'No published answer for this question'
                : `Correct answer: ${LETTERS[free.answerIndex]} — ${free.en.options[free.answerIndex]}`}
            </b>
            <div>{free.en.explanation}</div>
            {free.fr && (
              <div className="muted" style={{ marginTop: '.4rem' }}>
                {free.fr.explanation}
              </div>
            )}
          </div>
        </div>

        <Provenance q={free} />

        {courses.length > 0 && (
          <section style={{ margin: '1.6rem 0' }}>
            <h2>Courses that include this</h2>
            <ul className="qlist">
              {courses.map((c) => (
                <li key={c.slug}>
                  <Link href={`/courses/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="navrow">
          <Link className="btn" href="/exam">
            Practise the full past paper
          </Link>
          <Link className="btn ghost" href="/unlock">
            Unlock all 2,446 questions
          </Link>
        </div>
      </>
    );
  }

  const paid: QuestionPreview | null = await previewBySlug(slug).catch(() => null);
  if (!paid) notFound();

  const related = await relatedPreviews(paid.topic, paid.slug).catch(() => []);

  // No acceptedAnswer: this page does not show one. Emitting the correct answer
  // in structured data while withholding it from the page is exactly the
  // mismatch between markup and content that manual actions target.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const jsonLd = [{
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Topics', item: `${site}/topics` },
      { '@type': 'ListItem', position: 2, name: paid.topic, item: `${site}/topics/${topicSlug(paid.topic)}` },
      { '@type': 'ListItem', position: 3, name: paid.en.stem.slice(0, 70), item: `${site}/questions/${paid.slug}` },
    ],
  }, {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: paid.en.stem,
      text: paid.en.stem,
      answerCount: 0,
      suggestedAnswer: paid.en.options.map((o) => ({ '@type': 'Answer', text: o })),
    },
  }];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="muted" style={{ marginBottom: '.4rem' }}>
        <Link href="/topics">Topics</Link> /{' '}
        <Link href={`/topics/${topicSlug(paid.topic)}`}>{paid.topic}</Link>
      </p>

      <h1 style={{ fontSize: '1.5rem' }}>{paid.en.stem}</h1>
      {paid.fr && <p className="lead">{paid.fr.stem}</p>}

      <div className="card" style={{ margin: '1.2rem 0' }}>
        <div className="lbl muted">Answers</div>
        {paid.en.options.map((opt, i) => (
          <div key={i} className="opt">
            <span className="letter">{LETTERS[i]}</span>
            <span className="dot">
              <i />
            </span>
            <span className="txt">
              <span>{opt}</span>
              {paid.fr && <span className="fr">{paid.fr.options[i]}</span>}
            </span>
          </div>
        ))}

        <div className="locked">
          <strong>The answer and explanation are in the full bank.</strong>
          <p className="muted">
            This question is one of 2,246 in the paid banks. Each comes with the correct
            answer and the reasoning behind it, not just a mark.
          </p>
          <Link className="btn" href="/unlock">
            Unlock for 5,000 RWF
          </Link>
        </div>
      </div>

      <Provenance q={{ ...paid, examNumber: null }} />

      {related.length > 0 && (
        <section style={{ margin: '1.8rem 0' }}>
          <h2>More {paid.topic} questions</h2>
          <ul>
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/questions/${r.slug}`}>{r.en.stem}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <UpsellCard variant="full" />
    </>
  );
}
