import free from '@/data/questions.free.json';

/**
 * One source of truth for every number the site quotes.
 *
 * Hardcoding these is how "53,000 questions" survived as long as it did: the
 * copy said one thing and the corpus another, and nothing could tell you which
 * was wrong. TOTAL is derived at build time from the files themselves.
 */
export const FREE_COUNT = (free as unknown[]).length;

/** Written by scripts/build-corpus.mjs so the paid side needs no import. */
export const PAID_COUNT = 15825;
export const TOTAL_COUNT = FREE_COUNT + PAID_COUNT;

export const fmt = (n: number) => n.toLocaleString('en-US');
