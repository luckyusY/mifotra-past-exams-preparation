import type { MetadataRoute } from 'next';
import { freeQuestions, topics, topicSlug } from '@/lib/questions';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
  ];
}
