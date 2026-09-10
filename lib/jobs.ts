import 'server-only';
import { getDb } from '@/lib/db';
// Plain ESM, shared verbatim with scripts/. TypeScript reads it through allowJs,
// so the JSDoc annotations in that file are the types on this side too.
import { syncJobs, currentJobs, TAGS, SOURCE, RELEVANT_AT } from '@/lib/jobs-source.mjs';

/**
 * Typed surface over the shared scraper.
 *
 * The parsing itself lives in `lib/jobs-source.mjs` so that the nightly cron
 * route and `node scripts/fetch-jobs.mjs` run the same code rather than two
 * drifting copies of it.
 */

export type Job = {
  key: string;
  slug: string;
  title: string;
  employer: string | null;
  employerSlug: string | null;
  location: string | null;
  url: string;
  source: string;
  sourceName: string;
  publishedAt: Date | null;
  deadline: Date | null;
  level: string | null;
  category: string;
  /** From the detail page, only for rows worth a second request. */
  sector?: string | null;
  education?: string | null;
  experience?: string | null;
  contract?: string | null;
  positions?: number | null;
  applyUrl?: string | null;
  tags: string[];
  score: number;
  publicSector: boolean;
  procurement: boolean;
  relevant: boolean;
  firstSeen: Date;
  lastSeen: Date;
};

export type SyncStats = {
  seen: number;
  skipped: number;
  added: number;
  updated: number;
  enriched: number;
  relevant: number;
  errors: string[];
};

/** Labels only - the matching patterns are not serialisable and stay on the server. */
export const JOB_TAGS: { id: string; label: string; core: boolean }[] = (
  TAGS as { id: string; label: string; core: boolean }[]
).map((t) => ({ id: t.id, label: t.label, core: t.core }));

export const JOB_SOURCE = SOURCE as { id: string; name: string; base: string };
export const JOB_RELEVANT_AT = RELEVANT_AT as number;

export async function runJobSync(options: Record<string, unknown> = {}): Promise<SyncStats> {
  return syncJobs(await getDb(), options) as Promise<SyncStats>;
}

export async function openJobs(
  options: { tag?: string | null; limit?: number } = {},
): Promise<Job[]> {
  // The driver types a projected find() as WithId<Document>, which carries no
  // knowledge of what this collection holds. The shape is guaranteed by
  // syncJobs being the only writer.
  const docs = await currentJobs(await getDb(), options);
  return docs as unknown as Job[];
}

/**
 * The shape a client component receives: dates as ISO strings.
 *
 * Mongo hands back `Date` objects and the RSC payload would carry them across,
 * but then every consumer has to remember which fields are Dates and which are
 * strings. Flattening once here means the board never has to care.
 */
export type JobView = Omit<Job, 'publishedAt' | 'deadline' | 'firstSeen' | 'lastSeen'> & {
  publishedAt: string | null;
  deadline: string | null;
};

const iso = (d: Date | string | null | undefined): string | null => {
  if (!d) return null;
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export function toView(job: Job): JobView {
  const view: Record<string, unknown> = { ...job };
  // firstSeen and lastSeen are bookkeeping for the sync, not for the board.
  delete view.firstSeen;
  delete view.lastSeen;
  return {
    ...(view as Omit<Job, 'publishedAt' | 'deadline' | 'firstSeen' | 'lastSeen'>),
    publishedAt: iso(job.publishedAt),
    deadline: iso(job.deadline),
  };
}

/** Days until a deadline, floored at zero. Used for the "closes in N days" line. */
export function daysLeft(deadline: Date | string | null, now = new Date()): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - now.getTime();
  return Number.isNaN(ms) ? null : Math.max(0, Math.ceil(ms / 86_400_000));
}
