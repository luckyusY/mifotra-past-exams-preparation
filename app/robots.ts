import type { MetadataRoute } from 'next';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Search crawlers and AI crawlers are both welcome on the free surface.
      // Being readable by assistants is how people in Rwanda find this when they
      // ask about MIFOTRA exams rather than typing into a search box.
      {
        userAgent: [
          '*', 'Googlebot', 'Bingbot',
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-User', 'anthropic-ai',
          'PerplexityBot', 'Google-Extended', 'Applebot-Extended',
        ],
        allow: '/',
        disallow: ['/api/', '/admin'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
