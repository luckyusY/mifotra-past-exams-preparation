import { NextResponse } from 'next/server';
import { getDb, ensureIndexes, type AccessCode } from '@/lib/db';
import { generateCode, hashCode } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** List issued codes. Only the hash is stored, so plaintext is never shown again. */
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const db = await getDb();
  const codes = await db
    .collection<AccessCode>('access_codes')
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(300)
    .toArray();

  return NextResponse.json({
    total: codes.length,
    redeemed: codes.filter((c) => c.redeemedAt).length,
    codes: codes.map((c) => ({
      // The full hash is the row's identity, needed to revoke. It is one-way,
      // so exposing it to an authenticated admin reveals nothing about the code.
      codeHash: c.codeHash,
      hint: c.codeHash.slice(0, 8),
      bankId: c.bankId,
      note: c.note ?? '',
      createdAt: c.createdAt,
      redeemedAt: c.redeemedAt ?? null,
      revoked: !!c.revoked,
    })),
  });
}

/** Generate a batch. The plaintext codes come back once and are not recoverable. */
export async function POST(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { count = 1, bankId = 1, note = '' } = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(count) || 1, 1), 100);

  await ensureIndexes();
  const db = await getDb();

  const plain = Array.from({ length: n }, generateCode);
  await db.collection<AccessCode>('access_codes').insertMany(
    plain.map((code) => ({
      codeHash: hashCode(code),
      bankId: Number(bankId) || 1,
      note: String(note).slice(0, 200),
      createdAt: new Date(),
      redeemedAt: null,
      redeemedDevice: null,
      revoked: false,
    }))
  );

  return NextResponse.json({ ok: true, bankId, codes: plain });
}

/** Revoke or restore a code. /api/redeem already refuses revoked codes. */
export async function PATCH(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { codeHash, action } = await req.json().catch(() => ({}));
  if (typeof codeHash !== 'string' || !['revoke', 'unrevoke'].includes(action)) {
    return NextResponse.json({ error: 'Give a codeHash and a valid action.' }, { status: 400 });
  }

  const db = await getDb();
  const result = await db
    .collection<AccessCode>('access_codes')
    .updateOne({ codeHash }, { $set: { revoked: action === 'revoke' } });

  if (!result.matchedCount) {
    return NextResponse.json({ error: 'No such code.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, codeHash, revoked: action === 'revoke' });
}
