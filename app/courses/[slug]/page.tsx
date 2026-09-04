import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COURSES, courseBySlug, freeQuestionsFor } from '@/lib/courses';
import { topicSlug } from '@/lib/questions';
import ExamRunner from '@/app/ExamRunner';
import UpsellCard from '@/app/UpsellCard';
import Provenance from '@/app/Provenance';

export const revalidate = 86400;

export function generateStaticParams() {
  return COURSES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const course = courseBySlug((await params).slug);
  if (!course) return {};
  const n = freeQuestionsFor(course).length;
  return {
    title: `${course.name} practice questions`,
    description:
      `${course.blurb} ${n} free questions with worked answers, plus a timed ${course.examLength}-question practice exam.`.slice(
        0,
        300
      ),
    keywords: course.keywords,
    alternates: { canonical: `/courses/${course.slug}` },
  };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const course = courseBySlug((await params).slug);
  if (!course) notFound();

  const questions = freeQuestionsFor(course);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const topics = [...new Set(questions.map((q) => q.topic))].sort();

  // Breadcrumbs give Google the hierarchy explicitly rather than making it infer
  // one from URLs, and they render in the result snippet.
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Courses', item: `${site}/courses` },
        { '@type': 'ListItem', position: 2, name: course.name, item: `${site}/courses/${course.slug}` },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: course.name,
      description: course.intro,
      provider: { '@type': 'Organization', name: 'MIFOTRA Past Exams Preparation', url: site },
      hasCourseInstance: {
        '@type': 'CourseInstance',
        courseMode: 'online',
        courseWorkload: `PT${course.durationMinutes}M`,
      },
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <p className="muted" style={{ marginBottom: '.4rem' }}>
        <Link href="/courses">Courses</Link>
      </p>

      {course.slug === 'mifotra-ict-officer' && (
        <span className="badge-real" style={{ marginBottom: '.6rem', display: 'inline-block' }}>
          Real past paper
        </span>
      )}

      <h1>{course.name}</h1>
      <p className="lead">{course.intro}</p>

      <div className="card grid" style={{ margin: '1.4rem 0' }}>
        <div className="stat">
          <b>{questions.length}</b>
          <span>Free questions</span>
        </div>
        <div className="stat">
          <b>{course.examLength}</b>
          <span>Exam length</span>
        </div>
        <div className="stat">
          <b>{course.durationMinutes}m</b>
          <span>Time limit</span>
        </div>
        <div className="stat">
          <b>{topics.length}</b>
          <span>Topics</span>
        </div>
      </div>

      {topics.length > 0 && (
        <section style={{ marginBottom: '1.6rem' }}>
          <h2>What this course covers</h2>
          <ul className="qlist">
            {topics.map((t) => (
              <li key={t}>
                <Link href={`/topics/${topicSlug(t)}`}>{t}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {questions.length > 0 ? (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Practice exam</h2>
          <p className="muted">
            {Math.min(course.examLength, questions.length)} questions, {course.durationMinutes}{' '}
            minutes. Answers and explanations appear as you go.
          </p>
          <ExamRunner
            questions={questions.slice(0, course.examLength)}
            title={course.short}
            durationMinutes={course.durationMinutes}
            mode="study"
            shuffleQuestions={course.slug !== 'mifotra-ict-officer'}
            showUpsell
          />
        </section>
      ) : (
        <div className="notice">No free questions in this course yet.</div>
      )}

      {questions.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2>Browse these questions</h2>
          <ul className="qlist">
            {questions.slice(0, 20).map((q) => (
              <li key={q.id}>
                <Link href={`/questions/${q.slug}`}>{q.en.stem}</Link>
              </li>
            ))}
          </ul>
          <Provenance q={questions[0]} className="muted" />
        </section>
      )}

      <section style={{ marginBottom: '1.6rem' }}>
        <h2>Other courses</h2>
        <ul className="qlist">
          {COURSES.filter((c) => c.slug !== course.slug).map((c) => (
            <li key={c.slug}>
              <Link href={`/courses/${c.slug}`}>{c.name}</Link>{' '}
              <span className="muted" style={{ fontSize: '.86rem' }}>
                &middot; {c.blurb}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <UpsellCard variant="full" />
    </>
  );
}
