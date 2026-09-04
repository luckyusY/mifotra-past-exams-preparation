import type { Question } from '@/lib/questions';

/**
 * Every question on this site is MIFOTRA exam preparation - that is what the
 * product is and how it is sold, so everything carries the MIFOTRA label.
 *
 * The one distinction kept is source, and it is kept because it is a selling
 * point rather than a caveat: 50 items are the real transcribed past paper and
 * say so in green, the rest are practice written to published objectives. That
 * split is what lets the site claim a genuine past paper at all. Calling all
 * 2,446 "past papers" would put a false claim in front of paying buyers and
 * make the real ones worth nothing.
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
    <p
      className={className ?? 'muted'}
      style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}
    >
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
  );
}
