import type { MetadataRoute } from 'next';
import { freeQuestions, topics, topicSlug } from '@/lib/questions';
import { publishedPosts } from '@/lib/posts';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Blog posts live in the database, so a failure here must not break the sitemap.
  let posts: Awaited<ReturnType<typeof publishedPosts>> = [];
  try {
    posts = await publishedPosts();
  } catch {
    posts = [];
  }

  return [
    { url: `${site}/`, lastModified: now, priority: 1 },
    { url: `${site}/exam`, lastModified: now, priority: 0.9 },
    { url: `${site}/practice`, lastModified: now, priority: 0.7 },
    { url: `${site}/topics`, lastModified: now, priority: 0.8 },
    ...topics.map((t) => ({
      url: `${site}/topics/${topicSlug(t)}`,
      lastModified: now,
      priority: 0.7,
    })),
    ...freeQuestions.map((q) => ({
      url: `${site}/questions/${q.slug}`,
      lastModified: now,
      priority: 0.6,
    })),
    { url: `${site}/blog`, lastModified: now, priority: 0.8 },
    ...posts.map((p) => ({
      url: `${site}/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      priority: 0.7,
    })),
  ];
}
