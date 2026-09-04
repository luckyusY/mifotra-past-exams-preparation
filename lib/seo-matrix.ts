import { freeQuestions, topicSlug } from '@/lib/questions';
import { COURSES } from '@/lib/courses';

/**
 * Programmatic SEO topic matrix.
 *
 * pSEO works by covering a keyword space systematically rather than writing one
 * post at a time: a set of intent patterns crossed with a set of entities the
 * site actually has data about. The entities here are drawn from the real
 * question corpus, so every generated page has genuine material behind it -
 * which is the difference between a content programme and a doorway farm
 * Google will eventually strip out.
 */

export type SeoTopic = {
  /** The page title / search intent. */
  title: string;
  /** Pattern id, so the admin UI can group and the model can be steered. */
  pattern: string;
  /** The entity this instance covers. */
  entity: string;
  /** Extra steer passed to the model. */
  steer: string;
};

/** Intent patterns. Each is a way candidates actually phrase a search. */
const PATTERNS: {
  id: string;
  title: (e: string) => string;
  steer: (e: string) => string;
}[] = [
  {
    id: 'topic-guide',
    title: (e) => `${e} questions in the MIFOTRA ICT exam: what is actually tested`,
    steer: (e) =>
      `Cover the ${e} sub-areas that appear in Rwandan public-service ICT recruitment exams. Give worked reasoning, not definitions alone.`,
  },
  {
    id: 'common-mistakes',
    title: (e) => `The ${e} mistakes candidates make most often`,
    steer: (e) =>
      `Focus on the specific confusions candidates get wrong in ${e}, and explain why the wrong answer looks right.`,
  },
  {
    id: 'how-to-answer',
    title: (e) => `How to answer ${e} multiple-choice questions under time pressure`,
    steer: (e) =>
      `Practical technique for ${e} items: how to read the stem, eliminate distractors, and manage the clock.`,
  },
  {
    id: 'study-plan',
    title: (e) => `A two-week study plan for ${e}`,
    steer: (e) =>
      `A realistic day-by-day plan for someone revising ${e} around a job. Assume limited time and a phone as the main device.`,
  },
  {
    id: 'glossary',
    title: (e) => `${e} terms every Rwandan ICT exam candidate should know`,
    steer: (e) =>
      `Explain the essential ${e} vocabulary plainly, each with why it matters in an exam context.`,
  },
];

/** Standalone topics that are not per-entity but are worth ranking for. */
const STANDALONE: SeoTopic[] = [
  {
    title: 'How the MIFOTRA written exam is scored and what the marks mean',
    pattern: 'exam-mechanics',
    entity: 'scoring',
    steer:
      'Explain marks weighting (1 to 4 per question), the 51-question format, the two-hour limit, and what that implies for pacing.',
  },
  {
    title: 'What to expect on the day of a MIFOTRA written exam',
    pattern: 'exam-mechanics',
    entity: 'exam day',
    steer:
      'Logistics and mindset: the bilingual interface, the question navigator, flagging, and time management. Do not invent venue or date specifics.',
  },
  {
    title: 'Preparing for a Rwanda public service ICT exam with no formal IT training',
    pattern: 'audience',
    entity: 'self-taught candidates',
    steer:
      'For candidates without a computing degree. Where to start, what to skip, and the order that builds fastest.',
  },
  {
    title: 'English and French terminology in Rwandan public service ICT exams',
    pattern: 'bilingual',
    entity: 'bilingual exams',
    steer:
      'The exam presents each question in both languages. Cover the technical terms whose French form trips candidates up.',
  },
];

/** Entities come from the corpus, so we only write about what we can support. */
export function entities(): string[] {
  return [...new Set(freeQuestions.map((q) => q.topic))].sort();
}

/**
 * Course-level patterns. These target the higher-volume searches - people look
 * for "how hard is CCNA" far more than for any single topic - and each one has
 * a course hub to link into.
 */
const COURSE_PATTERNS: { id: string; title: (n: string) => string; steer: (n: string) => string }[] = [
  {
    id: 'course-overview',
    title: (n) => `${n}: what the exam covers and how to prepare`,
    steer: (n) => `An orientation to ${n} for a Rwandan candidate: scope, difficulty, and a sensible order to study in.`,
  },
  {
    id: 'course-difficulty',
    title: (n) => `How hard is ${n}, really?`,
    steer: (n) => `Honest assessment of ${n} difficulty and preparation time. Do not invent pass rates or statistics.`,
  },
  {
    id: 'course-vs',
    title: (n) => `${n} or a Rwandan public-service ICT exam: which to sit first`,
    steer: (n) => `Compare ${n} against Rwandan public-service ICT recruitment in terms of cost, recognition and job outcomes locally.`,
  },
];

/** The full matrix: topic patterns x topics, course patterns x courses, plus standalones. */
export function buildMatrix(): SeoTopic[] {
  const out: SeoTopic[] = [];
  for (const entity of entities()) {
    for (const p of PATTERNS) {
      out.push({ title: p.title(entity), pattern: p.id, entity, steer: p.steer(entity) });
    }
  }
  for (const c of COURSES) {
    for (const p of COURSE_PATTERNS) {
      out.push({ title: p.title(c.name), pattern: p.id, entity: c.short, steer: p.steer(c.name) });
    }
  }
  return [...STANDALONE, ...out];
}

/**
 * Find which corpus topic a free-text title is about, so ad-hoc posts get the
 * same internal linking as matrix ones. Without this a hand-typed topic
 * produces an orphan page, which is the single most common reason generated
 * content never gets indexed.
 *
 * Longest match wins, so "Hardware & Operating Systems" beats "Hardware".
 */
export function inferEntity(text: string): string | null {
  const hay = text.toLowerCase();
  let best: string | null = null;
  for (const e of entities()) {
    if (hay.includes(e.toLowerCase()) && (!best || e.length > best.length)) best = e;
  }
  return best;
}

/**
 * Question pages relevant to an entity, for internal linking. Orphan pages do
 * not rank: every generated post has to point at the corpus, and the topic hubs
 * point back.
 */
export function linksFor(entity: string | null, max = 6) {
  const slug = entity ? topicSlug(entity) : '';
  const questions = entity
    ? freeQuestions
        .filter((q) => topicSlug(q.topic) === slug)
        .slice(0, max)
        .map((q) => ({ href: `/questions/${q.slug}`, label: q.en.stem }))
    : [];

  // Standalone topics (exam mechanics, audience pieces) have no matching corpus
  // topic. They still must not ship as orphans, so fall back to a spread of
  // past-paper questions and the topics index.
  if (!questions.length) {
    return {
      topicHref: '/topics',
      questions: freeQuestions
        .filter((q) => q.examNumber !== null)
        .slice(0, max)
        .map((q) => ({ href: `/questions/${q.slug}`, label: q.en.stem })),
    };
  }

  return { topicHref: `/topics/${slug}`, questions };
}
