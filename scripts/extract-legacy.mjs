// Extracts and de-duplicates the legacy question corpus.
//
// Two sources, both previously unusable:
//   1. questions_*.js  - 572 scenario questions the old app never loaded (no <script src>)
//   2. the inline bank in technical_mastery_5000_questions.html - 4000 rows that the old
//      app multiplied by 13 location prefixes to advertise "53,000 questions"
//
// This script drops the multiplier, collapses restatements of the same fact, and strips
// the boilerplate that was appended to every item.

import fs from 'node:fs';
import path from 'node:path';

const LEGACY = path.resolve(process.argv[2] ?? '..');
const HTML = path.join(LEGACY, 'technical_mastery_5000_questions.html');

/* ---------- source 1: the orphaned questions_*.js files ---------- */

function loadScenarioFiles() {
  const out = [];
  globalThis.addQ = (topic, sub, difficulty, stem, correct, distractors, explanation, source) =>
    out.push({ topic, sub, difficulty, stem, correct, distractors, explanation, source });

  for (const f of fs.readdirSync(LEGACY).filter((x) => /^questions_.*\.js$/.test(x))) {
    (0, eval)(fs.readFileSync(path.join(LEGACY, f), 'utf8'));
  }
  delete globalThis.addQ;

  return out.map((q) => ({
    topic: q.topic,
    subtopic: q.sub,
    difficulty: q.difficulty,
    stem: q.stem.trim(),
    options: [q.correct, ...q.distractors],
    answerIndex: 0,
    explanation: q.explanation.trim(),
    source: q.source,
    origin: 'scenario',
  }));
}

/* ---------- source 2: the inline HTML bank ---------- */

// Boilerplate the generator appended to every single item.
const EXPLANATION_TAILS = [
  ' This result should be verified against the documented specification before corrective work is closed.',
  ' Verify units, operating limits, signal levels, and safety before applying the result in a real sound or radio system.',
];

// Prefixes injected by the 13x location multiplier and the generated audio exam.
const STEM_PREFIXES = [
  /^Rwanda Form \d+ · Item \d+ · (In a [^,]+, )?/,
  /^Special Audio-Wave \d+: (In a [^,]+, )?/,
];

// The fixed French sentence glued onto every stem - not a translation.
const FAKE_FRENCH = /\s*\/\s*Fran[çc]ais\s*:.*$/;

function stripStem(s) {
  let t = String(s).replace(FAKE_FRENCH, '');
  for (const re of STEM_PREFIXES) t = t.replace(re, '');
  // The generator also bolted a generic instruction onto many stems.
  t = t.replace(/\s*Which option gives the technically correct and safely verifiable response\?$/, '');
  return t.replace(/\s+/g, ' ').trim();
}

function stripExplanation(s) {
  let t = String(s);
  for (const tail of EXPLANATION_TAILS) if (t.endsWith(tail)) t = t.slice(0, -tail.length);
  t = t.replace(/\s*Explication fran[çc]aise\s*:.*$/, '');
  return t.replace(/\s+/g, ' ').trim();
}

function loadHtmlBank() {
  const lines = fs.readFileSync(HTML, 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('const AUTHORED_BATCH_001_RAW'));
  const end = lines.findIndex((l) => l.startsWith('const RWANDA_CONTEXTS'));
  if (start < 0 || end < 0) throw new Error('could not locate the authored batches in the HTML');

  const resistorStart = lines.findIndex((l) => l.startsWith('const RESISTOR_COLOR_ROWS'));
  const resistorEnd = lines.findIndex((l, i) => i > resistorStart && l.trim() === '];');

  const block = lines.slice(start, end).join('\n');
  const resistors = lines.slice(resistorStart, resistorEnd + 1).join('\n');

  const rows = (0, eval)(`
    ${block}
    ${resistors}
    [...AUTHORED_BATCH_001_RAW, ...AUTHORED_BATCH_002_RAW,
     ...AUTHORED_BATCH_003_RAW, ...AUTHORED_BATCH_004_RAW, ...RESISTOR_COLOR_ROWS]
  `);

  // row: [topic, subtopic, difficulty, stage, stem, options[], explanation, cert, domain]
  return rows.map((r) => ({
    topic: r[0],
    subtopic: r[1],
    difficulty: r[2],
    stem: stripStem(r[4]),
    options: r[5].slice(),
    answerIndex: 0,
    explanation: stripExplanation(r[6]),
    source: r[7],
    origin: 'bank',
  }));
}

/* ---------- dedup ---------- */

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Two items are the same question if they offer the same choices and teach the same point,
// no matter how the stem was reworded. This is what collapses 4000 rows to ~1800.
const factKey = (q) => `${[...q.options].map(norm).sort().join('|')}##${norm(q.explanation)}`;

function dedupe(items) {
  const best = new Map();
  for (const q of items) {
    const k = factKey(q);
    const prev = best.get(k);
    // Keep the most specific stem: scenario questions beat generated ones, then longest wins.
    if (
      !prev ||
      (q.origin === 'scenario' && prev.origin !== 'scenario') ||
      (q.origin === prev.origin && q.stem.length > prev.stem.length)
    ) {
      best.set(k, q);
    }
  }
  return [...best.values()];
}

/* ---------- run ---------- */

const scenario = loadScenarioFiles();
const bank = loadHtmlBank();
const all = [...scenario, ...bank];
const unique = dedupe(all);

// Drop items whose stem carries no actual question after boilerplate removal.
const usable = unique.filter(
  (q) =>
    q.stem.length > 25 &&
    q.options.length === 4 &&
    new Set(q.options.map(norm)).size === 4 &&
    q.explanation.length > 20
);

usable.forEach((q, i) => (q.id = `L${String(i + 1).padStart(4, '0')}`));

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/legacy-pool.json', JSON.stringify(usable, null, 1));

const byTopic = {};
for (const q of usable) byTopic[q.topic] = (byTopic[q.topic] ?? 0) + 1;

console.log(`scenario files : ${scenario.length}`);
console.log(`html bank      : ${bank.length}`);
console.log(`combined       : ${all.length}`);
console.log(`after dedupe   : ${unique.length}   (removed ${all.length - unique.length} restatements)`);
console.log(`usable         : ${usable.length}`);
console.log('\nby topic:');
for (const [t, n] of Object.entries(byTopic).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${t}`);
}
