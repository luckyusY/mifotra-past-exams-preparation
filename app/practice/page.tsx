import type { Metadata } from 'next';
import ExamRunner from '../ExamRunner';
import { freeQuestions } from '@/lib/questions';

export const metadata: Metadata = {
  title: 'Quick practice drill',
  description: 'A short randomised drill drawn from the free MIFOTRA ICT question bank.',
};

export default function PracticePage() {
  return (
    <>
      <h1>Quick drill</h1>
      <p className="lead" style={{ marginBottom: '1.2rem' }}>
        Twenty questions pulled at random from the free bank, 30 minutes.
      </p>
      <ExamRunner
        questions={freeQuestions.slice(0, 20)}
        title="Quick drill"
        durationMinutes={30}
        mode="study"
      />
    </>
  );
}
