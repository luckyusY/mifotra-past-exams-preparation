import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb, type PaidQuestion } from '@/lib/db';
import { readSession, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The only route that serves paid questions. Without a valid session cookie it
 * returns 401 and no question bodies at all - nothing is filtered client-side.
 */
export async function GET() {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: 'No active access code.' }, { status: 401 });
  }

  const db = await getDb();
  const questions = await db
    .collection<PaidQuestion>('questions')
    .find({ bankId: session.bankId })
    .project({ _id: 0 })
    .toArray();

  return NextResponse.json({ bankId: session.bankId, count: questions.length, questions });
}
