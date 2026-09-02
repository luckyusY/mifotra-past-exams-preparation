// Re-computes internal links for posts written before the orphan fallback
// existed. Safe to re-run.
//
//   node scripts/backfill-links.mjs

import fs from 'node:fs';
import { MongoClient } from 'mongodb';

function env(key) {
  const line = fs.readFileSync('.env.local', 'utf8').split('\n').find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^"|"$/g, '');
}

const free = JSON.parse(fs.readFileSync('data/questions.free.json', 'utf8'));
const slugOf = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const topics = [...new Set(free.map((q) => q.topic))];

function inferEntity(text) {
  const hay = text.toLowerCase();
  let best = null;
  for (const t of topics) if (hay.includes(t.toLowerCase()) && (!best || t.length > best.length)) best = t;
  return best;
}

function linksFor(entity) {
  const slug = entity ? slugOf(entity) : '';
  const questions = entity
    ? free.filter((q) => slugOf(q.topic) === slug).slice(0, 6)
        .map((q) => ({ href: `/questions/${q.slug}`, label: q.en.stem }))
    : [];
  if (!questions.length) {
    return {
      topicHref: '/topics',
      questions: free.filter((q) => q.examNumber !== null).slice(0, 6)
        .map((q) => ({ href: `/questions/${q.slug}`, label: q.en.stem })),
    };
  }
  return { topicHref: `/topics/${slug}`, questions };
}

const client = new MongoClient(env('MONGODB_URI'));
await client.connect();
const posts = client.db(env('MONGODB_DB') ?? 'mifotra').collection('posts');

let fixed = 0;
for (const p of await posts.find({}).toArray()) {
  const hasLinks = p.links?.questions?.length > 0;
  if (hasLinks) continue;
  const entity = p.entity ?? inferEntity(`${p.topic} ${p.title} ${(p.keywords ?? []).join(' ')}`);
  await posts.updateOne(
    { slug: p.slug },
    { $set: { entity: entity ?? undefined, links: linksFor(entity) } }
  );
  console.log(`  fixed ${p.slug} -> entity ${entity ?? '(fallback)'}`);
  fixed++;
}

const remaining = (await posts.find({}).toArray()).filter((p) => !p.links?.questions?.length);
console.log(`\nbackfilled ${fixed}; orphans remaining: ${remaining.length}`);

await client.close();
