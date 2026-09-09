import type { Metadata } from 'next';
import { freeQuestions } from '@/lib/questions';
import StudyDashboard from './StudyDashboard';

export const metadata: Metadata = {
  title: 'Study plan and progress',
  description:
    'Track your MIFOTRA exam preparation: daily goal, streak, sets of 100 questions, and the questions you got wrong.',
  alternates: { canonical: '/study' },
};

export default function StudyPage() {
  return (
    <>
      <h1>Your study plan</h1>
      <p className="lead" style={{ marginBottom: '1.4rem' }}>
        Work through sets of 100. Progress is kept on this device, so you can start straight
        away without an account &mdash; clearing your browser will clear it too.
      </p>
      <StudyDashboard freeQuestions={freeQuestions} />
    </>
  );
}
