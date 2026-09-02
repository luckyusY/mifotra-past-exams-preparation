// Pushes the paid banks into MongoDB. The paid file is gitignored, so this is the
// only path by which those questions reach production.
//
//   node scripts/seed-mongo.mjs

import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI ?? readEnv('MONGODB_URI');
const dbName = process.env.MONGODB_DB ?? readEnv('MONGODB_DB') ?? 'mifotra';

function readEnv(key) {
  if (!fs.existsSync('.env.local')) return undefined;
  const line = fs.readFileSync('.env.local', 'utf8')
    .split('\n').find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^"|"$/g, '');
}

if (!uri) {
  console.error('MONGODB_URI not set (checked env and .env.local)');
  process.exit(1);
}

const paid = JSON.parse(fs.readFileSync('data/questions.paid.json', 'utf8'));

const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbName);

await db.collection('questions').createIndex({ id: 1 }, { unique: true });
await db.collection('questions').createIndex({ bankId: 1 });
await db.collection('access_codes').createIndex({ codeHash: 1 }, { unique: true });

// Idempotent: re-running updates in place rather than duplicating.
const ops = paid.map((q) => ({
  updateOne: { filter: { id: q.id }, update: { $set: q }, upsert: true },
}));

for (let i = 0; i < ops.length; i += 500) {
  const chunk = ops.slice(i, i + 500);
  const res = await db.collection('questions').bulkWrite(chunk);
  console.log(`  ${i + chunk.length}/${ops.length}  (+${res.upsertedCount} new)`);
}

const banks = await db.collection('questions').aggregate([
  { $group: { _id: '$bankId', n: { $sum: 1 } } }, { $sort: { _id: 1 } },
]).toArray();

console.log('\nseeded banks:');
for (const b of banks) console.log(`  bank ${b._id}: ${b.n} questions`);

await client.close();
