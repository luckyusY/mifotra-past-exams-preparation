import 'server-only';
import { getDb } from '@/lib/db';
import { createHash, randomUUID } from 'node:crypto';

/**
 * Daily limits for the AI teacher.
 *
 * The cost is real and per-request, so this cannot be open to anyone who finds
 * the URL - one script would empty the account overnight. Limits rise with what
 * someone has already committed: a stranger gets a taste, a paying customer
 * gets a working allowance, an AI-tier code gets enough to study a whole
 * evening on, and the owner is uncapped.
 *
 * Counting is per device per day, and the reset is midnight UTC rather than a
 * rolling window, because "you get N a day" is a promise people can hold in
 * their head.
 */

export const AI_COOKIE = 'mifotra_ai_device';

export type Tier = 'anon' | 'buyer' | 'ai' | 'admin';

export const DAILY_LIMIT: Record<Tier, number> = {
  anon: 3,
  buyer: 15,
  ai: 120,
  admin: Number.POSITIVE_INFINITY,
};

export const TIER_LABEL: Record<Tier, string> = {
  anon: 'Free',
  buyer: 'With access code',
  ai: 'AI teacher',
  admin: 'Admin',
};

export function newDeviceId(): string {
  return randomUUID();
}

/** UTC day, so the reset time is the same fact for everyone. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export type QuotaState = {
  tier: Tier;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
};

export async function quotaFor(device: string, tier: Tier): Promise<QuotaState> {
  const limit = DAILY_LIMIT[tier];
  if (!Number.isFinite(limit)) {
    return { tier, used: 0, limit: Infinity, remaining: Infinity, resetsAt: 'never' };
  }

  const db = await getDb();
  const row = await db
    .collection('ai_usage')
    .findOne({ device, day: today() }, { projection: { _id: 0, count: 1 } });

  const used = row?.count ?? 0;
  return {
    tier,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: `${today()}T24:00Z`,
  };
}

/**
 * Claim one request. Returns false when the allowance is spent.
 *
 * The increment is a single atomic upsert rather than read-then-write, so two
 * requests arriving together cannot both see the same count and both pass.
 */
export async function claim(device: string, tier: Tier): Promise<boolean> {
  const limit = DAILY_LIMIT[tier];
  if (!Number.isFinite(limit)) return true;

  const db = await getDb();
  const col = db.collection('ai_usage');

  // The unique index is what makes this correct. Without it, an upsert whose
  // filter includes `count < limit` simply INSERTS a second row once the quota
  // is spent, and the allowance silently becomes unlimited - which is exactly
  // what the first version did.
  await col.createIndex({ device: 1, day: 1 }, { unique: true }).catch(() => {});

  try {
    const res = await col.findOneAndUpdate(
      { device, day: today(), count: { $lt: limit } },
      { $inc: { count: 1 }, $setOnInsert: { device, day: today(), firstAt: new Date() } },
      { upsert: true, returnDocument: 'after' }
    );
    return Boolean(res);
  } catch (err) {
    // Duplicate key means a row for today already exists and did not match the
    // `count < limit` filter, i.e. the allowance is used up.
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

/* ---------- AI-tier access codes ---------- */

export const hashAiCode = (code: string) =>
  createHash('sha256').update(code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

/** True when this device has redeemed an AI-tier code that is still valid. */
export async function hasAiTier(device: string): Promise<boolean> {
  if (!device) return false;
  const db = await getDb();
  const row = await db.collection('ai_codes').findOne(
    { redeemedDevice: device, revoked: { $ne: true } },
    { projection: { _id: 0, expiresAt: 1 } }
  );
  if (!row) return false;
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return false;
  return true;
}
