import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, type AccessCode } from '@/lib/db';
import { hashCode, signSession, SESSION_COOKIE, readSession } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({ code: '' }));
  if (typeof code !== 'string' || code.length < 8) {
    return NextResponse.json({ error: 'Enter the code exactly as you received it.' }, { status: 400 });
  }

  const codeHash = hashCode(code);
  const db = await getDb();
  const codes = db.collection<AccessCode>('access_codes');

  const existing = await codes.findOne({ codeHash });
  if (!existing) {
    return NextResponse.json({ error: 'That code was not recognised.' }, { status: 404 });
  }
  if (existing.revoked) {
    return NextResponse.json({ error: 'That code has been revoked.' }, { status: 403 });
  }

  // Re-entering your own code on the same device is allowed - clearing cookies
  // should not cost someone the access they paid for.
  if (existing.redeemedAt) {
    const session = await readSession(
      (req.headers.get('cookie') ?? '')
        .split(';')
        .map((c) => c.trim().split('='))
        .find(([k]) => k === SESSION_COOKIE)?.[1]
    );
    if (session && session.device === existing.redeemedDevice) {
      return NextResponse.json({ ok: true, bankId: existing.bankId, reused: true });
    }
    return NextResponse.json(
      { error: 'That code has already been used. Each code works once.' },
      { status: 409 }
    );
  }

  const device = randomUUID();

  // Atomic claim: the filter requires the code to still be unredeemed, so two
  // simultaneous submissions cannot both succeed.
  const claimed = await codes.findOneAndUpdate(
    { codeHash, redeemedAt: { $in: [null, undefined] }, revoked: { $ne: true } },
    { $set: { redeemedAt: new Date(), redeemedDevice: device } },
    { returnDocument: 'after' }
  );

  if (!claimed) {
    return NextResponse.json(
      { error: 'That code has already been used. Each code works once.' },
      { status: 409 }
    );
  }

  await db.collection('redemptions').insertOne({
    codeHash,
    device,
    bankId: claimed.bankId,
    createdAt: new Date(),
    ip: req.headers.get('x-forwarded-for') ?? null,
  });

  const token = await signSession({ bankId: claimed.bankId, device });
  const res = NextResponse.json({ ok: true, bankId: claimed.bankId });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
