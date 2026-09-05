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
  en: { stem: string; options: string[]; explanation: string };
  fr: { stem: string; options: string[]; explanation: string } | null;
};

export const freeQuestions = free as Question[];

export const mifotraQuestions = freeQuestions
  .filter((q) => q.examNumber !== null)
  .sort((a, b) => (a.examNumber ?? 0) - (b.examNumber ?? 0));

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
