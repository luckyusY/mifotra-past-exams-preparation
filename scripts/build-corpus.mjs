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

const all = [...fromMifotra, ...fromHeadteacher, ...fromLegacy];

/* Slugs must be unique - they are URLs. */
const seen = new Map();
for (const q of all) {
  const n = (seen.get(q.slug) ?? 0) + 1;
  seen.set(q.slug, n);
  if (n > 1) q.slug = `${q.slug}-${n}`;
}

const free = all.filter((q) => q.tier === 'free');

fs.writeFileSync('data/questions.free.json', JSON.stringify(free, null, 1));
fs.writeFileSync('data/questions.paid.json', JSON.stringify(paid, null, 1));

const banks = {};
for (const q of paid) banks[q.bankId] = (banks[q.bankId] ?? 0) + 1;

const unverified = all.filter((q) => q.verified === false).length;

console.log(`ICT past paper     : ${fromMifotra.length}  (bilingual, free)`);
console.log(`Headteacher paper  : ${fromHeadteacher.length}  (free, ${unverified} without a published answer)`);
console.log(`legacy pool        : ${fromLegacy.length}`);
console.log(`-`.repeat(46));
console.log(`free  (in repo)    : ${free.length}`);
console.log(`paid  (MongoDB)    : ${paid.length}`);
console.log(`total              : ${all.length}`);
console.log(`\npaid banks:`);
for (const [id, n] of Object.entries(banks)) console.log(`  bank ${id}: ${n} questions`);
