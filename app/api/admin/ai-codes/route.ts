import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { generateCode } from '@/lib/session';
import { hashAiCode } from '@/lib/ai-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Codes that raise a device to the AI tier for a period. */
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const db = await getDb();
  const rows = await db
    .collection('ai_codes')
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return NextResponse.json({
    codes: rows.map((c) => ({
      hint: String(c.codeHash).slice(0, 8),
      note: c.note ?? '',
      days: c.days,
      createdAt: c.createdAt,
      redeemedAt: c.redeemedAt ?? null,
      expiresAt: c.expiresAt ?? null,
      revoked: !!c.revoked,
    })),
  });
}

export async function POST(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { count = 1, days = 30, note = '' } = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(count) || 1, 1), 50);
  const validFor = Math.min(Math.max(Number(days) || 30, 1), 365);

  const db = await getDb();
  await db.collection('ai_codes').createIndex({ codeHash: 1 }, { unique: true }).catch(() => {});

  const plain = Array.from({ length: n }, generateCode);
  await db.collection('ai_codes').insertMany(
    plain.map((code) => ({
      codeHash: hashAiCode(code),
      days: validFor,
      note: String(note).slice(0, 200),
      createdAt: new Date(),
      redeemedAt: null,
      redeemedDevice: null,
      expiresAt: null,
      revoked: false,
    }))
  );

  return NextResponse.json({ ok: true, days: validFor, codes: plain });
}
