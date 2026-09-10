import 'server-only';
import { createHash } from 'node:crypto';
import { getDb } from '@/lib/db';

/**
 * Cache of AI explanations, keyed by question.
 *
 * Two reasons this is worth storing rather than regenerating. The obvious one
 * is cost: a popular question gets explained once instead of once per learner.
 * The better one is that the bank improves as it is used - every question
 * someone asks about gains a worked explanation that the next person gets
 * instantly, so the corpus is slowly enriched by its own traffic.
 *
 * A cache hit still spends quota. It costs nothing to serve, but if cached
 * answers were unlimited then the whole bank would become freely explained
 * within a week and the paid AI tier would be worth nothing.
 */

export type CachedExplanation = {
  key: string;
  questionId: string;
  /** null for the general explanation, set when the learner asked something specific. */
  ask: string | null;
  text: string;
  model: string;
  createdAt: Date;
  hits: number;
  lastHitAt: Date;
};

/** A specific question gets its own cache slot; the general one is the default. */
export function cacheKey(questionId: string, ask?: string): string {
  const norm = (ask ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!norm) return questionId;
  return `${questionId}#${createHash('sha256').update(norm).digest('hex').slice(0, 16)}`;
}

export async function readCached(questionId: string, ask?: string) {
  const db = await getDb();
  const key = cacheKey(questionId, ask);
  const row = await db
    .collection<CachedExplanation>('explanations')
    .findOneAndUpdate(
      { key },
      { $inc: { hits: 1 }, $set: { lastHitAt: new Date() } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
  return row ?? null;
}

export async function writeCached(
  questionId: string,
  ask: string | undefined,
  text: string,
  model: string
) {
  const db = await getDb();
  const col = db.collection<CachedExplanation>('explanations');
  await col.createIndex({ key: 1 }, { unique: true }).catch(() => {});
  await col.createIndex({ questionId: 1 }).catch(() => {});

  const key = cacheKey(questionId, ask);
  await col.updateOne(
    { key },
    {
      $setOnInsert: {
        key,
        questionId,
        ask: ask?.trim() ? ask.trim().slice(0, 300) : null,
        text,
        model,
        createdAt: new Date(),
        hits: 0,
        lastHitAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/** How much of the bank now has a stored explanation. */
export async function coverage() {
  const db = await getDb();
  const [total, explained, agg] = await Promise.all([
    db.collection('questions').countDocuments(),
    db.collection('explanations').countDocuments({ ask: null }),
    db
      .collection('explanations')
      .aggregate([{ $group: { _id: null, hits: { $sum: '$hits' } } }])
      .toArray(),
  ]);
  const saved = agg[0]?.hits ?? 0;
  return { total, explained, saved };
}
