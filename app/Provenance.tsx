import type { Question } from '@/lib/questions';

/**
 * Says what a question actually is.
 *
 * Only the 50 transcribed items are past-paper questions; the other 2,396 are
 * original practice written against published objectives. Labelling all of them
 * "MIFOTRA past paper" would be a false claim to people paying for them, and
 * the first buyer who recognised it would tell everyone else - this is a small
 * community. The honest split also reads better: a real past paper plus a large
 * practice bank is a stronger offer than an implausible pile of past papers.
 */
export default function Provenance({
  q,
  className,
}: {
  q: Pick<Question, 'examSource' | 'examNumber' | 'marks' | 'difficulty'>;
  className?: string;
}) {
  const isPastPaper = q.examNumber !== null;

  return (
    <p className={className ?? 'muted'} style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {isPastPaper ? (
        <span className="badge-real">
          Past paper &middot; Question {q.examNumber}
        </span>
      ) : (
        <span className="pill">Practice question</span>
      )}
      <span>{q.examSource}</span>
      <span>&middot;</span>
      <span>
        {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
      </span>
      <span>&middot;</span>
      <span>{q.difficulty}</span>
    </p>
  );
}
