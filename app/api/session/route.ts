import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSession, SESSION_COOKIE } from '@/lib/session';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Who is the caller? Nothing more.
 *
 * The header needs this on every page, so it must not touch the database or
 * return any question content - reusing /api/questions for it would ship a
 * whole 1,000-question bank to render a badge.
 */
export async function GET(req: Request) {
  if (await isAdmin(req)) {
    return NextResponse.json({ role: 'admin' }, { headers: { 'cache-control': 'no-store' } });
  }

  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return NextResponse.json(
    session ? { role: 'buyer', bankId: session.bankId } : { role: 'anon' },
    { headers: { 'cache-control': 'no-store' } }
  );
}
