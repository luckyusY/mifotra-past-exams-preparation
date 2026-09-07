// Structural audit of the whole corpus.
//
// Correctness of 2,446 answers cannot be established by script - that needs
// domain reading. What a script CAN do is find the tells that a question is
// broken or was machine-generated badly, which is where bad answers cluster.

import fs from 'node:fs';

const free = JSON.parse(fs.readFileSync('data/questions.free.json', 'utf8'));
const paid = JSON.parse(fs.readFileSync('data/questions.paid.json', 'utf8'));
const all = [...free, ...paid];

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const findings = {};
const add = (k, q, detail = '') => {
  (findings[k] ??= []).push({ id: q.id, source: q.examSource, stem: q.en.stem.slice(0, 70), detail });
};

for (const q of all) {
  const o = q.en.options;
  const ans = q.answerIndex;
  const expl = q.en.explanation ?? '';

  // structural
  if (o.length !== 4) add('not four options', q, `${o.length} options`);
  if (new Set(o.map(norm)).size !== o.length) add('duplicate options', q);
  if (o.some((x) => !x || !x.trim())) add('empty option', q);
  if (ans !== null && (ans < 0 || ans >= o.length)) add('answer out of range', q, String(ans));

  // truncation and encoding
  if (/\b(and|or|the|of|to|in|a|with|for)\s*$/i.test(q.en.stem.trim())) add('stem ends mid-sentence', q);
  if (o.some((x) => /\b(and|or|the|of|to)\s*$/i.test(x.trim()))) add('option ends mid-sentence', q);
  if (/[\u00c2\u00c3\ufffd]/.test(q.en.stem + o.join('') + expl)) add('mojibake', q);

  // quality tells
  if (q.en.stem.trim().length < 30) add('very short stem', q, `${q.en.stem.trim().length} chars`);
  if (expl.length < 25) add('thin explanation', q, `${expl.length} chars`);

  if (ans !== null) {
    const correct = o[ans];
    // The classic generated-bank tell: the right answer is the longest option.
    const lens = o.map((x) => x.length);
    if (lens[ans] === Math.max(...lens) && lens[ans] > Math.min(...lens) * 2) {
      add('correct option is much the longest', q, `${lens[ans]} vs ${Math.min(...lens)}`);
    }
    // An explanation that never references its own answer is usually boilerplate.
    const key = norm(correct).split(' ').filter((w) => w.length > 4).slice(0, 4);
    if (key.length && !key.some((w) => norm(expl).includes(w))) {
      add('explanation does not mention the answer', q);
    }
  }

  // "all of the above" style options
  const allAbove = o.findIndex((x) => /all (the )?(answers?|options?|of the above|benefits|examples|strategies)/i.test(x));
  if (allAbove >= 0 && ans !== null && ans !== allAbove) {
    add('has an all-of-the-above that is not the answer', q);
  }
}

// answer-position bias across the keyed set
const keyed = all.filter((q) => q.answerIndex !== null);
const dist = [0, 0, 0, 0];
for (const q of keyed) dist[q.answerIndex]++;

// duplicates across the whole corpus
const byFact = new Map();
for (const q of all) {
  const k = `${[...q.en.options].map(norm).sort().join('|')}##${norm(q.en.explanation)}`;
  byFact.set(k, (byFact.get(k) ?? 0) + 1);
}
const dupes = [...byFact.values()].filter((n) => n > 1).length;

console.log(`corpus: ${all.length}  (free ${free.length}, paid ${paid.length})`);
console.log(`keyed : ${keyed.length}   unkeyed: ${all.length - keyed.length}`);
console.log('');
console.log('answer position distribution (want roughly even):');
dist.forEach((n, i) =>
  console.log(`  ${'ABCD'[i]}  ${String(n).padStart(5)}  ${(n / keyed.length * 100).toFixed(1)}%`)
);
console.log('');
console.log(`duplicate fact groups still present: ${dupes}`);
console.log('');
console.log('findings:');
const order = Object.entries(findings).sort((a, b) => b[1].length - a[1].length);
for (const [k, list] of order) console.log(`  ${String(list.length).padStart(5)}  ${k}`);

fs.writeFileSync('data/audit.json', JSON.stringify(findings, null, 1));
console.log('\nfull detail -> data/audit.json');
