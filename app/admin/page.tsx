import type { Metadata } from 'next';
import AdminPanel from './AdminPanel';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <>
      <h1>Access codes</h1>
      <p className="lead">
        Generate a code after confirming a MoMo payment. The plaintext is shown once and is not
        recoverable &mdash; copy it before leaving the page.
      </p>
      <AdminPanel />
    </>
  );
}
