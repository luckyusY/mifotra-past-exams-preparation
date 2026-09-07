// Merges every question source into one schema and splits it into tiers.
//
// free  -> committed to the public repo, statically rendered, indexed by search engines
// paid  -> pushed to MongoDB only, served behind a redeemed access code
//
// Run scripts/extract-legacy.mjs first to produce data/legacy-pool.json.

import fs from 'node:fs';

const BANK_SIZE = 1000;
const FREE_LEGACY = 150;

const mifotra = JSON.parse(fs.readFileSync('data/mifotra-2024.json', 'utf8'));
const headteacher = JSON.parse(fs.readFileSync('data/mifotra-headteacher-dos.json', 'utf8'));
const legacy = JSON.parse(fs.readFileSync('data/legacy-pool.json', 'utf8'));

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

/* MIFOTRA past paper - the headline content, all free and all indexed. */
const fromMifotra = mifotra.questions.map((q) => ({
  id: q.id,
  slug: `${slug(q.en.stem)}-${q.id.toLowerCase()}`,
  examSource: 'MIFOTRA Centralized ICT Acquisition Officer',
  examNumber: q.number,
  topic: q.topic,
  marks: q.marks,
  difficulty: q.marks === 1 ? 'Easy' : q.marks === 3 ? 'Medium' : 'Hard',
  en: q.en,
  fr: q.fr,
  answerIndex: q.answerIndex,
  verified: true,
  bilingual: true,
  tier: 'free',
  bankId: null,
}));

/* Deputy Headteacher past paper. English only, and seven items carry no answer
   because the source had no key and those questions turn on published policy
   figures. They are still worth publishing: candidates get the real questions
   and are told plainly which ones to look up. */
const fromHeadteacher = headteacher.questions.map((q) => ({
  id: q.id,
  slug: `${slug(q.stem)}-${q.id.toLowerCase()}`,
  examSource: 'MIFOTRA Deputy Headteacher in Charge of Studies',
  examNumber: q.number,
  topic: q.topic,
  marks: q.marks,
  difficulty: q.marks === 1 ? 'Easy' : q.marks === 3 ? 'Medium' : 'Hard',
  en: { stem: q.stem, options: q.options, explanation: q.explanation },
  fr: null,
  answerIndex: q.answerIndex,
  verified: q.verified,
  bilingual: false,
  tier: 'free',
  bankId: null,
}));

/* Legacy pool - English only for now; fr is null and the UI falls back to en. */
const fromLegacy = legacy.map((q) => ({
  id: q.id,
  slug: `${slug(q.stem)}-${q.id.toLowerCase()}`,
  examSource: q.source,
  examNumber: null,
  topic: q.topic,
  marks: q.difficulty === 'Easy' ? 1 : q.difficulty === 'Medium' ? 3 : 4,
  difficulty: q.difficulty,
  en: { stem: q.stem, options: q.options, explanation: q.explanation },
  fr: null,
  answerIndex: q.answerIndex,
  verified: true,
  bilingual: false,
  tier: 'paid',
  bankId: null,
}));

/* Spread the free legacy sample across topics so the indexed pages cover the whole syllabus. */
const byTopic = new Map();
for (const q of fromLegacy) {
  if (!byTopic.has(q.topic)) byTopic.set(q.topic, []);
  byTopic.get(q.topic).push(q);
}
const topics = [...byTopic.keys()];
let picked = 0;
for (let round = 0; picked < FREE_LEGACY; round++) {
  let advanced = false;
  for (const t of topics) {
    const list = byTopic.get(t);
    if (round >= list.length) continue;
    advanced = true;
    list[round].tier = 'free';
    if (++picked >= FREE_LEGACY) break;
  }
  if (!advanced) break;
}

/* Number the paid banks. */
const paid = fromLegacy.filter((q) => q.tier === 'paid');
paid.forEach((q, i) => (q.bankId = Math.floor(i / BANK_SIZE) + 1));

/**
 * Break the answer-position tell.
 *
 * The legacy bank stored the correct answer first, so 100% of its answers sat
 * at option A. The exam runner reshuffles at runtime, but the static question
 * pages and the paid PREVIEW pages render the stored order - which meant every
 * paid answer was readable for free by picking A. The paywall did not hold.
 *
 * Shuffling is seeded on the question id so it is identical on every build:
 * static pages must not churn, and a reseed must not move answers under people
 * who already hold a bank.
 */
function seeded(id) {
  let h = 1779033703 ^ id.length;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function deshuffle(q) {
  if (q.answerIndex === null || q.answerIndex === undefined) return q;
  const rand = seeded(q.id);
  const idx = q.en.options.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const remap = (block) =>
    block ? { ...block, options: idx.map((i) => block.options[i]) } : block;
  return {
    ...q,
    en: remap(q.en),
    fr: remap(q.fr),
    answerIndex: idx.indexOf(q.answerIndex),
  };
}

const all = [...fromMifotra, ...fromHeadteacher, ...fromLegacy].map(deshuffle);

/* Slugs must be unique - they are URLs. */
const seen = new Map();
for (const q of all) {
  const n = (seen.get(q.slug) ?? 0) + 1;
  seen.set(q.slug, n);
  if (n > 1) q.slug = `${q.slug}-${n}`;
}

const free = all.filter((q) => q.tier === 'free');
// Both tiers must come from `all`, i.e. after deshuffle. Reading `paid` off
// fromLegacy earlier meant the paid bank kept its answer-at-A ordering.
const paidOut = all.filter((q) => q.tier === 'paid');

fs.writeFileSync('data/questions.free.json', JSON.stringify(free, null, 1));
fs.writeFileSync('data/questions.paid.json', JSON.stringify(paidOut, null, 1));

const banks = {};
for (const q of paidOut) banks[q.bankId] = (banks[q.bankId] ?? 0) + 1;

const unverified = all.filter((q) => q.verified === false).length;
const dist = [0, 0, 0, 0];
for (const q of all) if (q.answerIndex !== null) dist[q.answerIndex]++;
const keyed = dist.reduce((a, b) => a + b, 0);

console.log(`ICT past paper     : ${fromMifotra.length}  (bilingual, free)`);
console.log(`Headteacher paper  : ${fromHeadteacher.length}  (free, ${unverified} without a published answer)`);
console.log(`legacy pool        : ${fromLegacy.length}`);
console.log(`-`.repeat(46));
console.log(`free  (in repo)    : ${free.length}`);
console.log(`paid  (MongoDB)    : ${paidOut.length}`);
console.log(`total              : ${all.length}`);
console.log(`\npaid banks:`);
for (const [id, n] of Object.entries(banks)) console.log(`  bank ${id}: ${n} questions`);
