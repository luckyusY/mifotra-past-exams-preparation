import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isAdmin } from '@/lib/admin-auth';
import { coverage } from '@/lib/explanations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Stored explanations, most used first, with bank coverage. */
export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .collection('explanations')
    .find({}, { projection: { _id: 0 } })
    .sort({ hits: -1, createdAt: -1 })
    .limit(200)
    .toArray();

  return NextResponse.json({ ...(await coverage()), items: rows });
}

/**
 * Delete one stored explanation.
 *
 * The model is wrong occasionally, and a wrong explanation that is cached is
 * worse than one that is not: it gets served to everyone who asks, instantly,
 * for as long as it sits there. Deleting means the next request regenerates.
 */
export async function DELETE(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { key } = await req.json().catch(() => ({}));
  if (typeof key !== 'string') return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const db = await getDb();
  const res = await db.collection('explanations').deleteOne({ key });
  return NextResponse.json({ ok: true, deleted: res.deletedCount });
}
