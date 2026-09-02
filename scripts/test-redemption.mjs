// Verifies the access-code rules against a real MongoDB, using the same queries
// the redeem route runs. The business rule being proved is "each code works once".
//
//   node scripts/test-redemption.mjs

import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

/* Mirrors of lib/session.ts - kept identical so the test exercises the real rules. */
const normalizeCode = (c) => c.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashCode = (c) => createHash('sha256').update(normalizeCode(c)).digest('hex');
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

let pass = 0;
let fail = 0;
const t = (name, ok) => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
};

const mem = await MongoMemoryServer.create();
const client = new MongoClient(mem.getUri());
await client.connect();
const db = client.db('mifotra_test');
const codes = db.collection('access_codes');
await codes.createIndex({ codeHash: 1 }, { unique: true });

/** The exact claim the redeem route performs. */
async function claim(code) {
  const codeHash = hashCode(code);
  const found = await codes.findOne({ codeHash });
  if (!found) return { status: 404 };
  if (found.revoked) return { status: 403 };

  const device = randomUUID();
  const claimed = await codes.findOneAndUpdate(
    { codeHash, redeemedAt: { $in: [null, undefined] }, revoked: { $ne: true } },
    { $set: { redeemedAt: new Date(), redeemedDevice: device } },
    { returnDocument: 'after' }
  );
  if (!claimed) return { status: 409 };
  return { status: 200, bankId: claimed.bankId, device };
}

async function issue(bankId = 1, extra = {}) {
  const code = generateCode();
  await codes.insertOne({
    codeHash: hashCode(code),
    bankId,
    createdAt: new Date(),
    redeemedAt: null,
    redeemedDevice: null,
    revoked: false,
    ...extra,
  });
  return code;
}

console.log('single use');
{
  const code = await issue(2);
  const first = await claim(code);
  const second = await claim(code);
  t('first redemption succeeds', first.status === 200);
  t('grants the right bank', first.bankId === 2);
  t('second redemption is refused (409)', second.status === 409);
}

console.log('\nconcurrency');
{
  const code = await issue(1);
  // Ten simultaneous submissions of one code - exactly one must win.
  const results = await Promise.all(Array.from({ length: 10 }, () => claim(code)));
  const winners = results.filter((r) => r.status === 200);
  const losers = results.filter((r) => r.status === 409);
  t('exactly one of 10 concurrent redemptions wins', winners.length === 1);
  t('the other nine are refused', losers.length === 9);
  const doc = await codes.findOne({ codeHash: hashCode(code) });
  t('device recorded matches the winner', doc.redeemedDevice === winners[0].device);
}

console.log('\nunknown and revoked codes');
{
  t('unknown code is 404', (await claim(generateCode())).status === 404);
  const revoked = await issue(1, { revoked: true });
  t('revoked code is 403', (await claim(revoked)).status === 403);
}

console.log('\ninput tolerance');
{
  const code = await issue(3);
  const messy = ` ${code.toLowerCase().replace(/-/g, '  ')} `;
  const res = await claim(messy);
  t('spacing, dashes and case are ignored', res.status === 200 && res.bankId === 3);
}

console.log('\nstorage');
{
  const code = await issue(1);
  const doc = await codes.findOne({ codeHash: hashCode(code) });
  const raw = JSON.stringify(doc);
  t('plaintext code is never stored', !raw.includes(normalizeCode(code)));
  t('only the hash is persisted', /^[0-9a-f]{64}$/.test(doc.codeHash));
}

console.log(`\n${pass} passed, ${fail} failed`);

await client.close();
await mem.stop();
process.exit(fail ? 1 : 0);
