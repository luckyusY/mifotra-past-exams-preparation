import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/db';
import { AI_COOKIE, hashAiCode, newDeviceId } from '@/lib/ai-quota';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Redeem an AI-teacher code.
 *
 * Same single-use rule as a question-bank code, and the same atomic claim: the
 * update requires the code to still be unredeemed, so two people submitting the
 * same code at once cannot both win.
 */
export async function POST(req: Request) {
  const { code } = await req.json().catch(() => ({ code: '' }));
  if (typeof code !== 'string' || code.trim().length < 8) {
    return NextResponse.json({ error: 'Enter the code exactly as you received it.' }, { status: 400 });
  }

  const jar = await cookies();
  let device = jar.get(AI_COOKIE)?.value ?? '';
  let issued = false;
  if (!device) {
    device = newDeviceId();
    issued = true;
  }

  const db = await getDb();
  const codeHash = hashAiCode(code);
  const existing = await db.collection('ai_codes').findOne({ codeHash });

  if (!existing) return NextResponse.json({ error: 'That code was not recognised.' }, { status: 404 });
  if (existing.revoked) return NextResponse.json({ error: 'That code has been revoked.' }, { status: 403 });

  // Re-entering your own code on the same device is fine.
  if (existing.redeemedAt && existing.redeemedDevice !== device) {
    return NextResponse.json({ error: 'That code has already been used.' }, { status: 409 });
  }

  const expiresAt = new Date(Date.now() + (existing.days ?? 30) * 86400000);
  const claimed = await db.collection('ai_codes').findOneAndUpdate(
    { codeHash, $or: [{ redeemedAt: null }, { redeemedDevice: device }] },
    { $set: { redeemedAt: existing.redeemedAt ?? new Date(), redeemedDevice: device, expiresAt } },
    { returnDocument: 'after' }
  );
  if (!claimed) return NextResponse.json({ error: 'That code has already been used.' }, { status: 409 });

  const res = NextResponse.json({ ok: true, expiresAt, days: existing.days ?? 30 });
  if (issued) {
    res.cookies.set(AI_COOKIE, device, {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
