import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/db';
import { draftPost, providerConfigured } from '@/lib/llm';
import { buildMatrix, linksFor } from '@/lib/seo-matrix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function authorised(req: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  const given = req.headers.get('x-admin-password') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** The matrix, annotated with what has already been written. */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const db = await getDb();
  const existing = await db
    .collection('posts')
    .find({}, { projection: { _id: 0, topic: 1, status: 1 } })
    .toArray();

  const done = new Map(existing.map((p) => [p.topic, p.status]));
  const matrix = buildMatrix().map((t) => ({ ...t, status: done.get(t.title) ?? null }));

  return NextResponse.json({
    providerConfigured: providerConfigured(),
    total: matrix.length,
    written: matrix.filter((t) => t.status).length,
    matrix,
  });
}

/**
 * Draft several posts in one run, skipping anything already written.
 *
 * Generation is sequential on purpose: provider rate limits are the usual
 * failure mode for bulk jobs, and one slow batch beats a fast one that half
 * fails. A failure on any single topic is recorded and the run continues.
 */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { count = 5, pattern = null } = await req.json().catch(() => ({}));
  const n = Math.min(Math.max(Number(count) || 1, 1), 25);

  const db = await getDb();
  const posts = db.collection('posts');

  const alreadyWritten = new Set(
    (await posts.find({}, { projection: { _id: 0, topic: 1 } }).toArray()).map((p) => p.topic)
  );

  const queue = buildMatrix()
    .filter((t) => !alreadyWritten.has(t.title))
    .filter((t) => !pattern || t.pattern === pattern)
    .slice(0, n);

  if (!queue.length) {
    return NextResponse.json({ ok: true, created: [], failed: [], note: 'Nothing left to write.' });
  }

  const created: { slug: string; title: string }[] = [];
  const failed: { title: string; error: string }[] = [];

  for (const item of queue) {
    try {
      const draft = await draftPost(item.title, item.steer);

      let slug = draft.slug;
      for (let i = 2; await posts.findOne({ slug }); i++) slug = `${draft.slug}-${i}`;

      await posts.insertOne({
        ...draft,
        slug,
        status: 'draft',
        createdAt: new Date(),
        publishedAt: null,
        topic: item.title,
        pattern: item.pattern,
        entity: item.entity,
        // Internal links are computed from the corpus, not invented by the model.
        links: linksFor(item.entity),
      });

      created.push({ slug, title: draft.title });
    } catch (err) {
      failed.push({ title: item.title, error: (err as Error).message.slice(0, 160) });
    }
  }

  return NextResponse.json({ ok: true, created, failed, remaining: queue.length - created.length });
}
