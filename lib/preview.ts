import 'server-only';
import { getDb } from '@/lib/db';

/**
 * Indexable previews of paid questions.
 *
 * The stem and the four options are public; the answer key and explanation are
 * not. Two rules govern everything here:
 *
 * 1. `answerIndex` and `explanation` are projected OUT at the database layer,
 *    so they never reach the server component, the HTML, or the client bundle.
 *    Hiding them with CSS would still ship them in the payload.
 * 2. Crawlers and people are served the identical document. Rendering the
 *    answer for Googlebot and gating it for humans is cloaking, and sites get
 *    delisted for it.
 */

export type QuestionPreview = {
  id: string;
  slug: string;
  topic: string;
  marks: number;
  difficulty: string;
  examSource: string;
  bilingual: boolean;
  en: { stem: string; options: string[] };
  fr: { stem: string; options: string[] } | null;
};

/** Everything except the answer key. */
const PREVIEW_PROJECTION = {
  _id: 0,
  id: 1,
  slug: 1,
  topic: 1,
  marks: 1,
  difficulty: 1,
  examSource: 1,
  bilingual: 1,
  'en.stem': 1,
  'en.options': 1,
  'fr.stem': 1,
  'fr.options': 1,
} as const;

export async function previewBySlug(slug: string): Promise<QuestionPreview | null> {
  const db = await getDb();
  const row = await db
    .collection('questions')
    .findOne({ slug }, { projection: PREVIEW_PROJECTION });
  return row as unknown as QuestionPreview | null;
}

/** Same topic, for internal linking. A page nothing links to does not get indexed. */
export async function relatedPreviews(
  topic: string,
  excludeSlug: string,
  limit = 8
): Promise<Pick<QuestionPreview, 'slug' | 'en' | 'marks'>[]> {
  const db = await getDb();
  const rows = await db
    .collection('questions')
    .find(
      { topic, slug: { $ne: excludeSlug } },
      { projection: { _id: 0, slug: 1, marks: 1, 'en.stem': 1 } }
    )
    .limit(limit)
    .toArray();
  // A projection genuinely narrows the document, so the driver's generic type
  // no longer describes it.
  return rows as unknown as Pick<QuestionPreview, 'slug' | 'en' | 'marks'>[];
}

/** Paginated previews for a topic hub - the crawl path into the deep pages. */
export async function previewsForTopic(
  topic: string,
  skip = 0,
  limit = 60
): Promise<{ items: Pick<QuestionPreview, 'slug' | 'en' | 'marks' | 'difficulty'>[]; total: number }> {
  const db = await getDb();
  const col = db.collection('questions');
  const [items, total] = await Promise.all([
    col
      .find({ topic }, { projection: { _id: 0, slug: 1, marks: 1, difficulty: 1, 'en.stem': 1 } })
      .skip(skip)
      .limit(limit)
      .toArray(),
    col.countDocuments({ topic }),
  ]);
  return {
    items: items as unknown as Pick<QuestionPreview, 'slug' | 'en' | 'marks' | 'difficulty'>[],
    total,
  };
}

/** Every paid slug, for the sitemap. */
export async function allPreviewSlugs(): Promise<{ slug: string }[]> {
  const db = await getDb();
  const rows = await db
    .collection('questions')
    .find({}, { projection: { _id: 0, slug: 1 } })
    .toArray();
  return rows as unknown as { slug: string }[];
}

export async function topicCounts(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .collection('questions')
    .aggregate([{ $group: { _id: '$topic', n: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id as string, r.n as number]));
}
