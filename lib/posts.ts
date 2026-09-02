import { getDb } from '@/lib/db';

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
  model?: string;
};

export async function publishedPosts(limit = 100): Promise<Post[]> {
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
