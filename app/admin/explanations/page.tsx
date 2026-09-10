import type { Metadata } from 'next';
import Link from 'next/link';
import AdminMode from '../AdminMode';
import ExplanationList from './ExplanationList';

export const metadata: Metadata = {
  title: 'AI explanations',
  robots: { index: false, follow: false },
};

export default function AdminExplanationsPage() {
  return (
    <>
      <AdminMode />
      <p className="muted">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>AI explanations</h1>
      <p className="lead">
        Every explanation the AI teacher has produced, stored so the next learner gets it
        instantly. Read them &mdash; a wrong explanation that is cached is worse than one that
        is not, because it gets served to everyone. Deleting one makes the next request
        regenerate it.
      </p>
      <ExplanationList />
    </>
  );
}
