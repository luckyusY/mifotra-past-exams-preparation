// Local MongoDB for development, for networks that block port 27017 outbound
// (many ISPs and endpoint-security products do). Starts a real mongod on
// 127.0.0.1, seeds the paid banks, issues test codes, and stays running.
//
//   npm run dev:db
//
// Then point .env.local at the printed URI and run `npm run dev` in a second
// terminal. Data lives for the lifetime of this process only.

import fs from 'node:fs';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHash, randomBytes } from 'node:crypto';

const PORT = 27018;

const hashCode = (c) =>
  createHash('sha256').update(c.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
    if (i % 4 === 3 && i < 11) out += '-';
  }
  return out;
}

const mem = await MongoMemoryServer.create({ instance: { port: PORT, dbName: 'mifotra' } });
const uri = mem.getUri();

const client = new MongoClient(uri);
await client.connect();
const db = client.db('mifotra');

await db.collection('questions').createIndex({ id: 1 }, { unique: true });
await db.collection('questions').createIndex({ bankId: 1 });
await db.collection('access_codes').createIndex({ codeHash: 1 }, { unique: true });

if (fs.existsSync('data/questions.paid.json')) {
  const paid = JSON.parse(fs.readFileSync('data/questions.paid.json', 'utf8'));
  const ops = paid.map((q) => ({
    updateOne: { filter: { id: q.id }, update: { $set: q }, upsert: true },
  }));
  for (let i = 0; i < ops.length; i += 500) {
    await db.collection('questions').bulkWrite(ops.slice(i, i + 500));
  }
  console.log(`seeded ${paid.length} paid questions`);
} else {
  console.log('data/questions.paid.json missing - run `npm run data:build` first');
}

// A few ready-to-use codes so the unlock flow can be exercised immediately.
const codes = [1, 1, 2].map((bankId) => ({ code: generateCode(), bankId }));
await db.collection('access_codes').insertMany(
  codes.map(({ code, bankId }) => ({
    codeHash: hashCode(code),
    bankId,
    note: 'dev-db test code',
    createdAt: new Date(),
    redeemedAt: null,
    redeemedDevice: null,
    revoked: false,
  }))
);

console.log('\n' + '='.repeat(58));
console.log('Local MongoDB running. Put this in .env.local:\n');
console.log(`MONGODB_URI="mongodb://127.0.0.1:${PORT}/"`);
console.log('MONGODB_DB="mifotra"');
console.log('\nTest codes (each works once):');
for (const { code, bankId } of codes) console.log(`  ${code}   bank ${bankId}`);
console.log('\nLeave this terminal open. Ctrl+C stops the database.');
console.log('='.repeat(58) + '\n');

const shutdown = async () => {
  await client.close().catch(() => {});
  await mem.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
