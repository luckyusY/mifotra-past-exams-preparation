// Finds jobs worth applying for and keeps them in MongoDB.
//
//   node scripts/fetch-jobs.mjs            # fetch, classify, store
//   node scripts/fetch-jobs.mjs --dry      # fetch and print, touch no database
//   node scripts/fetch-jobs.mjs --all      # print everything indexed, not just matches
//
// In production this runs itself: vercel.json schedules /api/cron/jobs daily at
// 05:00 UTC (07:00 Kigali). This script exists so a run can be watched, and so
// the classifier can be tuned against real listings without deploying.

import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import {
  fetchIndex, fetchDetail, classify, syncJobs, SOURCE,
} from '../lib/jobs-source.mjs';

const args = new Set(process.argv.slice(2));
const dry = args.has('--dry');
const showAll = args.has('--all');

function readEnv(key) {
  if (!fs.existsSync('.env.local')) return undefined;
  const line = fs.readFileSync('.env.local', 'utf8')
    .split('\n').find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^"|"$/g, '');
}

const uri = process.env.MONGODB_URI ?? readEnv('MONGODB_URI');
const dbName = process.env.MONGODB_DB ?? readEnv('MONGODB_DB') ?? 'mifotra';

const pad = (s, n) => String(s ?? '').slice(0, n).padEnd(n);
const dayName = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '—');

function print(rows) {
  const shown = (showAll ? rows : rows.filter((r) => r.relevant))
    .sort((a, b) => b.score - a.score || (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

  console.log('');
  console.log(pad('SCORE', 6), pad('TAGS', 18), pad('TITLE', 46), pad('EMPLOYER', 28), 'CLOSES');
  console.log('-'.repeat(112));
  for (const r of shown) {
    console.log(
      pad(r.score + (r.publicSector ? ' gov' : ''), 6),
      pad(r.tags.join('+'), 18),
      pad(r.title, 46),
      pad(r.employer ?? '—', 28),
      dayName(r.deadline),
    );
  }
  console.log('-'.repeat(112));
  console.log(`${shown.length} shown · ${rows.filter((r) => r.relevant).length} relevant · ${rows.length} indexed`);
}

async function main() {
  console.log(`Reading ${SOURCE.base} …`);

  if (dry) {
    const rows = (await fetchIndex()).map((r) => ({ ...r, ...classify(r) }));
    // Enrich a few of the top matches so the sector field can be eyeballed too.
    for (const row of rows.filter((r) => r.relevant).sort((a, b) => b.score - a.score).slice(0, 5)) {
      try {
        Object.assign(row, await fetchDetail(row.url));
        Object.assign(row, classify(row));
      } catch (err) {
        console.warn(`  detail failed for ${row.slug}: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    print(rows);
    console.log('\nDry run: nothing was written.');
    return;
  }

  if (!uri) {
    console.error('MONGODB_URI not set (checked env and .env.local). Use --dry to test without a database.');
    process.exit(1);
  }

  const client = await new MongoClient(uri).connect();
  try {
    const stats = await syncJobs(client.db(dbName), { log: (m) => console.log(`  ${m}`) });
    if (stats.errors.length) {
      console.log('\nDetail pages that failed (the row is still stored, just unenriched):');
      for (const e of stats.errors) console.log(`  ${e}`);
    }
    console.log(`\nDone. ${stats.added} new, ${stats.relevant} relevant right now.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
