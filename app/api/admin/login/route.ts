import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, cookieOptions, passwordMatches, signAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Exchange the admin password for an 8-hour HttpOnly session. */
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));

  if (!passwordMatches(typeof password === 'string' ? password : null)) {
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await signAdmin(), cookieOptions(req));
  return res;
}

/** Sign out. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions(req), maxAge: 0 });
  return res;
}

/** Cheap check the console uses on mount to decide whether to show the password form. */
export async function GET(req: Request) {
  const { isAdmin } = await import('@/lib/admin-auth');
  return NextResponse.json({ signedIn: await isAdmin(req) });
}
