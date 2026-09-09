import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, type PaidQuestion } from '@/lib/db';
import { readSession, SESSION_COOKIE } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The only route that serves paid questions.
 *
 * Two ways in, and they grant different things:
 *
 *  - a redeemed access code, which returns exactly the one bank it paid for;
 *  - an admin session, which returns any bank, because the owner has to be able
 *    to review what is being sold without spending a code on it.
 *
 * Everything else gets 401 and no question bodies at all. The admin branch is
 * the only bypass and it runs through the same isAdmin() check as every other
 * admin route, so there is one place where that decision is made.
 */
export async function GET(req: Request) {
  const admin = await isAdmin(req);
  const session = admin ? null : await readSession((await cookies()).get(SESSION_COOKIE)?.value);

  if (!admin && !session) {
    return NextResponse.json({ error: 'No active access code.' }, { status: 401 });
  }

  const wanted = new URL(req.url).searchParams.get('bank');
  const db = await getDb();
  const col = db.collection<PaidQuestion>('questions');

  // A buyer is pinned to their own bank no matter what they put in the query
  // string; only an admin may choose, and only an admin may ask for everything.
  const filter =
    admin && wanted === 'all'
      ? {}
      : admin && wanted
        ? { bankId: Number(wanted) }
        : { bankId: admin ? 1 : session!.bankId };

  const questions = await col.find(filter).project({ _id: 0 }).sort({ id: 1 }).toArray();

  const banks = admin
    ? await col
        .aggregate([{ $group: { _id: '$bankId', n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
        .toArray()
        .then((rows) => rows.map((r) => ({ bankId: r._id as number, count: r.n as number })))
    : undefined;

  return NextResponse.json({
    bankId: admin ? (wanted === 'all' ? 'all' : Number(wanted) || 1) : session!.bankId,
    count: questions.length,
    admin: admin || undefined,
    banks,
    questions,
  });
}
