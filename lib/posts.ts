import { getDb } from '@/lib/db';

export type PostLinks = {
  topicHref: string | null;
  questions: { href: string; label: string }[];
};

export type Post = {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string[];
  intro: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[];
  status: 'draft' | 'published';
  createdAt: Date;
  publishedAt: Date | null;
  topic: string;
  pattern?: string;
  entity?: string;
  links?: PostLinks;
  model?: string;
};

export async function publishedPosts(limit = 500): Promise<Post[]> {
  const db = await getDb();
  return db
    .collection<Post>('posts')
    .find({ status: 'published' }, { projection: { _id: 0 } })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function postBySlug(slug: string): Promise<Post | null> {
  const db = await getDb();
  return db
    .collection<Post>('posts')
    .findOne({ slug, status: 'published' }, { projection: { _id: 0 } });
}

/**
 * Sibling posts for cross-linking. Same entity first, then anything else, so a
 * generated page is never a dead end. Crawlers reach deep pages through these
 * links; without them a large generated corpus mostly stays unindexed.
 */
export async function relatedPosts(post: Post, limit = 4): Promise<Post[]> {
  const db = await getDb();
  const col = db.collection<Post>('posts');
  const projection = { _id: 0, sections: 0, faq: 0 } as const;

  const sameEntity = post.entity
    ? await col
        .find(
          { status: 'published', slug: { $ne: post.slug }, entity: post.entity },
          { projection }
        )
        .limit(limit)
        .toArray()
    : [];

  if (sameEntity.length >= limit) return sameEntity;

  const filler = await col
    .find(
      {
        status: 'published',
        slug: { $ne: post.slug, $nin: sameEntity.map((p) => p.slug) },
      },
      { projection }
    )
    .sort({ publishedAt: -1 })
    .limit(limit - sameEntity.length)
    .toArray();

  return [...sameEntity, ...filler];
}
