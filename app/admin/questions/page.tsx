import type { Metadata } from 'next';
import AdminMode from '../AdminMode';
import Link from 'next/link';
import QuestionBrowser from './QuestionBrowser';

export const metadata: Metadata = {
  title: 'All questions',
  robots: { index: false, follow: false },
};

export default function AdminQuestionsPage() {
  return (
    <>
      <AdminMode />
      <p className="muted">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>All questions</h1>
      <p className="lead">
        Every paid question with its answer and explanation, readable without spending a code.
        Signed-in admins only.
      </p>
      <QuestionBrowser />
    </>
  );
}
