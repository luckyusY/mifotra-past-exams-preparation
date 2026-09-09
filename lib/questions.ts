import free from '@/data/questions.free.json';

export type Question = {
  id: string;
  slug: string;
  examSource: string;
  examNumber: number | null;
  topic: string;
  marks: number;
  difficulty: string;
  bilingual: boolean;
  tier: 'free' | 'paid';
  bankId: number | null;
  /** null where no answer is published - see `verified`. */
  answerIndex: number | null;
  /** false when the source carried no key and the answer turns on a policy
   *  figure we will not guess. Such questions are shown but never scored. */
  verified?: boolean;
  /**
   * How the answer came to be known. These are genuinely different standards of
   * evidence and the site should not flatten them into one word.
   *   cross-checked - compared against the marks in the source exam session
   *   derived       - reasoned from the question; the source had no key
   *   authored      - supplied already keyed by whoever wrote the item
   *   none          - no answer published
   */
  answerSource?: 'cross-checked' | 'derived' | 'authored' | 'none';
  en: { stem: string; options: string[]; explanation: string };
  fr: { stem: string; options: string[]; explanation: string } | null;
};

export const freeQuestions = free as Question[];

const byNumber = (a: Question, b: Question) => (a.examNumber ?? 0) - (b.examNumber ?? 0);

/**
 * One selector per paper. `examNumber !== null` used to mean "the past paper"
 * back when there was only one; adding the Deputy Headteacher paper silently
 * made it mean "both", which served a 100-question mixture under the ICT title.
 * Each paper is now named explicitly so a third one cannot repeat that.
 */
export const ictPaperQuestions = freeQuestions
  .filter((q) => q.examSource.includes('Centralized ICT'))
  .sort(byNumber);

export const headteacherQuestions = freeQuestions
  .filter((q) => q.examSource.includes('Deputy Headteacher'))
  .sort(byNumber);

/** Both real past papers, for counting only - never for serving as one exam. */
export const allPastPaperQuestions = freeQuestions.filter((q) => q.examNumber !== null);

export const topics = [...new Set(freeQuestions.map((q) => q.topic))].sort();

export const topicSlug = (t: string) =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function questionsForTopic(slug: string) {
  return freeQuestions.filter((q) => topicSlug(q.topic) === slug);
}

export function questionBySlug(slug: string) {
  return freeQuestions.find((q) => q.slug === slug);
}

/** Fisher-Yates. Used for both question order and option order. */
export function shuffle<T>(input: T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
