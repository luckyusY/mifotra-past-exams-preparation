import type { Metadata } from 'next';
import Link from 'next/link';
import AdminMode from '../AdminMode';
import ExamBuilder from './ExamBuilder';

export const metadata: Metadata = {
  title: 'Practice exam',
  robots: { index: false, follow: false },
};

export default function AdminExamPage() {
  return (
    <>
      <AdminMode />
      <p className="muted">
        <Link href="/admin">Admin</Link>
      </p>
      <h1>Practice exam</h1>
      <p className="lead">
        Sit an exam on any part of the paid bank &mdash; pick a subject, a topic and a length.
        Reading a question is not the same as being asked it, so this is the quickest way to
        find one that reads badly.
      </p>
      <ExamBuilder />
    </>
  );
}
