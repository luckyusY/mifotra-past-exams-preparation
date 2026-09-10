import { NextResponse } from 'next/server';
import { runJobSync } from '@/lib/jobs';
import { isAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * The daily run.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. An admin can
 * also trigger it by hand, which is how it gets tested without waiting for
 * midnight. Anything else gets 401 - the endpoint issues outbound requests to
 * someone else's site, so it must not be a button any passer-by can hold down.
 */
async function authorised(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization');
  if (secret && header === `Bearer ${secret}`) return true;
  return isAdmin(req);
}

export async function GET(req: Request) {
  if (!(await authorised(req))) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }

  const started = Date.now();
  try {
    const stats = await runJobSync({ log: (m: string) => console.log('[jobs]', m) });
    return NextResponse.json(
      { ok: true, ms: Date.now() - started, ...stats },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (err) {
    // A source that changed its markup must show up as a failed run, not as a
    // silently empty jobs page.
    console.error('[jobs] sync failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 502 },
    );
  }
}
