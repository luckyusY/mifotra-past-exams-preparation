import type { Metadata } from 'next';
import ExamRunner from '../ExamRunner';
import { mifotraQuestions } from '@/lib/questions';

export const metadata: Metadata = {
  title: 'MIFOTRA Centralized ICT Acquisition Officer - full past paper',
  description:
    'Sit the complete MIFOTRA Centralized ICT Acquisition Officer past paper: 50 bilingual questions, timed, with verified answers and explanations.',
};

export default function ExamPage() {
  return (
    <>
      <h1>Centralized ICT Acquisition Officer</h1>
      <p className="lead" style={{ marginBottom: '1.2rem' }}>
        {mifotraQuestions.length} questions, 2 hours, marks weighted 1&ndash;4 exactly as in the
        original sitting. Answers and explanations appear as you go.
      </p>
      <ExamRunner
        questions={mifotraQuestions}
        title="Centralized ICT Acquisition Officer"
        durationMinutes={120}
        mode="study"
        shuffleQuestions={false}
        showUpsell
      />
    </>
  );
}
