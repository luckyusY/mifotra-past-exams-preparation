import type { MetadataRoute } from 'next';
import { freeQuestions, topics, topicSlug } from '@/lib/questions';
import { publishedPosts } from '@/lib/posts';
import { allPreviewSlugs } from '@/lib/preview';
import { COURSES } from '@/lib/courses';

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

  // Paid question previews. A database failure must degrade the sitemap, not
  // break it - an empty sitemap is far worse than a partial one.
  let previews: { slug: string }[] = [];
  try {
    previews = await allPreviewSlugs();
  } catch {
    previews = [];
  }

  return [
    { url: `${site}/`, lastModified: now, priority: 1 },
    { url: `${site}/exam`, lastModified: now, priority: 0.9 },
    { url: `${site}/practice`, lastModified: now, priority: 0.7 },
    { url: `${site}/topics`, lastModified: now, priority: 0.8 },
    { url: `${site}/courses`, lastModified: now, priority: 0.9 },
    ...COURSES.map((c) => ({
      url: `${site}/courses/${c.slug}`,
      lastModified: now,
      priority: 0.9,
    })),
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
    ...previews.map((p) => ({
      url: `${site}/questions/${p.slug}`,
      lastModified: now,
      priority: 0.4,
    })),
    { url: `${site}/blog`, lastModified: now, priority: 0.8 },
    ...posts.map((p) => ({
      url: `${site}/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      priority: 0.7,
    })),
  ];
}
