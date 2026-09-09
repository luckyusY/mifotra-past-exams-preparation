import type { Question } from '@/lib/questions';

/**
 * Every question on this site is MIFOTRA exam preparation - that is what the
 * product is and how it is sold, so everything carries the MIFOTRA label.
 *
 * Two things are kept distinct because they are genuinely different, and
 * flattening them would be a claim the evidence does not support:
 *
 *  - source: 50 items are the real ICT past paper, 50 are the real Deputy
 *    Headteacher paper, the rest are practice written to published objectives.
 *  - how the answer is known: the ICT paper came with the candidate's own
 *    marks, so those keys were cross-checked against a real answer. The Deputy
 *    Headteacher paper arrived blank, so its answers were reasoned out here.
 *    A reasoned answer is worth publishing; it is not worth calling "verified".
 */

const ANSWER_NOTE: Record<string, string> = {
  derived: 'Answer worked out from the question - the source paper carried no key',
  none: 'No published answer - see the note below',
};

export default function Provenance({
  q,
  className,
}: {
  q: Pick<Question, 'examSource' | 'examNumber' | 'marks' | 'difficulty' | 'answerSource'>;
  className?: string;
}) {
  const isPastPaper = q.examNumber !== null;
  const note = q.answerSource ? ANSWER_NOTE[q.answerSource] : undefined;

  return (
    <div className={className ?? 'muted'}>
      <p style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center', margin: 0 }}>
        {isPastPaper ? (
          <span className="badge-real">MIFOTRA past paper &middot; Question {q.examNumber}</span>
        ) : (
          <span className="pill">MIFOTRA exam practice</span>
        )}
        {!isPastPaper && <span>aligned to {q.examSource}</span>}
        {isPastPaper && <span>{q.examSource}</span>}
        <span>&middot;</span>
        <span>
          {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
        </span>
        <span>&middot;</span>
        <span>{q.difficulty}</span>
      </p>

      {note && (
        <p className="answer-note" style={{ marginTop: '.5rem' }}>
          {note}
        </p>
      )}
    </div>
  );
}
