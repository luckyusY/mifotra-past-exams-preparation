import type { Metadata } from 'next';
import AdminMode from './AdminMode';
import Link from 'next/link';
import AdminPanel from './AdminPanel';
import AdminGate from '../AdminGate';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <AdminMode />
      <h1>Access codes</h1>
      <p className="lead">
        Generate a code after confirming a MoMo payment. The plaintext is shown once and is not
        recoverable &mdash; copy it before leaving the page.
      </p>
      <p className="navrow">
        <Link className="btn ghost" href="/admin/blog">Blog generator</Link>
        <Link className="btn ghost" href="/admin/questions">All questions</Link>
        <Link className="btn ghost" href="/admin/exam">Practice exam</Link>
        <Link className="btn ghost" href="/admin/explanations">AI explanations</Link>
      </p>
      <AdminGate>
        <AdminPanel />
      </AdminGate>
    </>
  );
}
