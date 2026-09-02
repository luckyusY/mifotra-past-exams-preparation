import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'node:crypto';
import { getDb } from '@/lib/db';
import { draftPost, providerConfigured } from '@/lib/llm';
import { inferEntity, linksFor } from '@/lib/seo-matrix';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? '';
  const given = req.headers.get('x-admin-password') ?? '';
  if (!expected || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** List every post, drafts included. */
export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const db = await getDb();
  const posts = await db
    .collection('posts')
    .find({}, { projection: { _id: 0, sections: 0, faq: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return NextResponse.json({ providerConfigured: providerConfigured(), posts });
}

/** Draft a post from a topic and save it unpublished. */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { topic, extra = '' } = await req.json().catch(() => ({}));
  if (typeof topic !== 'string' || topic.trim().length < 8) {
    return NextResponse.json({ error: 'Give a topic of at least 8 characters.' }, { status: 400 });
  }

  let draft;
  try {
    draft = await draftPost(topic.trim(), String(extra).slice(0, 800));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  const db = await getDb();
  const posts = db.collection('posts');

  // Slugs are URLs, so they have to be unique.
  let slug = draft.slug;
  for (let n = 2; await posts.findOne({ slug }); n++) slug = `${draft.slug}-${n}`;

  // Match the bulk path: work out which corpus topic this is about so the post
  // links into the question bank instead of shipping as an orphan.
  const entity = inferEntity(`${topic} ${draft.title} ${draft.keywords.join(' ')}`);

  const doc = {
    ...draft,
    slug,
    status: 'draft' as const,
    createdAt: new Date(),
    publishedAt: null as Date | null,
    topic: topic.trim(),
    entity: entity ?? undefined,
    links: linksFor(entity),
  };
  await posts.insertOne({ ...doc });

  return NextResponse.json({ ok: true, post: doc });
}

/** Publish, unpublish, or delete. */
export async function PATCH(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { slug, action } = await req.json().catch(() => ({}));
  if (typeof slug !== 'string') return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const db = await getDb();
  const posts = db.collection('posts');

  // Publishing has to show up immediately. Without this the ISR window means an
  // admin publishes a post and cannot see it for five minutes, and assumes it
  // failed.
  const refresh = () => {
    revalidatePath('/blog');
    revalidatePath(`/blog/${slug}`);
    revalidatePath('/sitemap.xml');
  };

  if (action === 'delete') {
    await posts.deleteOne({ slug });
    refresh();
    return NextResponse.json({ ok: true, deleted: slug });
  }
  if (action === 'publish' || action === 'unpublish') {
    const publishing = action === 'publish';
    await posts.updateOne(
      { slug },
      { $set: { status: publishing ? 'published' : 'draft', publishedAt: publishing ? new Date() : null } }
    );
    refresh();
    return NextResponse.json({ ok: true, slug, status: publishing ? 'published' : 'draft' });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
