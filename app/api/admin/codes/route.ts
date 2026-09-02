import { NextResponse } from 'next/server';
import { getDb, ensureIndexes, type AccessCode } from '@/lib/db';
import { generateCode, hashCode } from '@/lib/session';
import { timingSafeEqual } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorised(req: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  const given = req.headers.get('x-admin-password') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** List issued codes. Only the hash is stored, so plaintext is never shown again. */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

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
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

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
