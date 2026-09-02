import type { Metadata } from 'next';
import BlogConsole from './BlogConsole';

export const metadata: Metadata = {
  title: 'Blog generator',
  robots: { index: false, follow: false },
};

export default function AdminBlogPage() {
  return (
    <>
      <h1>Blog generator</h1>
      <p className="lead">
        Draft an SEO guide from a topic, review it, then publish. Drafts are not public
        until you publish them, and nothing is posted automatically.
      </p>
      <BlogConsole />
    </>
  );
}
