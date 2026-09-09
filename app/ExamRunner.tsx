'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Question } from '@/lib/questions';
import { shuffle } from '@/lib/questions';
import UpsellModal from './UpsellModal';
import { useLayoutMode, toggleFullscreen } from './useLayoutMode';
import { Maximize2, Minimize2 } from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D'];

type Lang = 'both' | 'en' | 'fr';

/** One question with its options already shuffled, and answerIndex remapped to match. */
type Prepared = Question & { order: number[]; answer: number };

function prepare(questions: Question[], doShuffle: boolean): Prepared[] {
  const list = doShuffle ? shuffle(questions) : questions;
  return list.map((q) => {
    const idx = q.en.options.map((_, i) => i);
    const order = doShuffle ? shuffle(idx) : idx;
    // answerIndex is null where no answer is published; -1 then means
    // "nothing to match", so the item can never be marked right or wrong.
    return { ...q, order, answer: q.answerIndex === null ? -1 : order.indexOf(q.answerIndex) };
  });
}

/**
 * A saved attempt.
 *
 * Answers are keyed by question id and store the index into that question's
 * ORIGINAL options array. Both question order and option order are shuffled on
 * mount, so anything positional would restore answers onto the wrong questions.
 */
type Saved = {
  answers: Record<string, number>;
  timeLeft: number;
  savedAt: number;
};

const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const keyFor = (title: string) => `mifotra_attempt_${title.replace(/\s+/g, '_')}`;

function readSaved(title: string): Saved | null {
  try {
    const raw = localStorage.getItem(keyFor(title));
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (!s?.answers || Date.now() - s.savedAt > MAX_AGE_MS) return null;
    return Object.keys(s.answers).length ? s : null;
  } catch {
    // Private mode throws on access; an attempt just is not resumable there.
    return null;
  }
}

function writeSaved(title: string, saved: Saved) {
  try {
    localStorage.setItem(keyFor(title), JSON.stringify(saved));
  } catch {
    /* nothing to do - the attempt continues, it simply is not saved */
  }
}

function clearSaved(title: string) {
  try {
    localStorage.removeItem(keyFor(title));
  } catch {
    /* ignore */
  }
}

function agoLabel(ms: number): string {
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
}

function clock(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function ExamRunner({
  questions,
  title,
  durationMinutes,
  mode = 'study',
  shuffleQuestions = true,
  showUpsell = false,
}: {
  questions: Question[];
  title: string;
  durationMinutes: number;
  mode?: 'study' | 'exam';
  shuffleQuestions?: boolean;
  /** Free surfaces offer the paid bank; the paid bank itself must not. */
  showUpsell?: boolean;
}) {
  // Shuffling must not run during render: the server and the client would pick
  // different orders and hydration would mismatch. Render the fixed order first,
  // then shuffle once on the client after mount.
  const initial = useMemo(() => prepare(questions, false), [questions]);
  const [prepared, setPrepared] = useState<Prepared[]>(initial);
  useEffect(() => {
    if (shuffleQuestions) setPrepared(prepare(questions, true));
  }, [questions, shuffleQuestions]);

  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [revealed, setRevealed] = useState<boolean[]>(() => questions.map(() => false));
  const [left, setLeft] = useState(durationMinutes * 60);
  const [done, setDone] = useState(false);
  // Read once on mount; the mapping back onto questions waits until the user
  // chooses Resume, by which point the shuffle has settled.
  const [pending, setPending] = useState<Saved | null>(null);
  const [started, setStarted] = useState(false);
  const [lang, setLang] = useState<Lang>('both');
  const [isFull, setIsFull] = useState(false);

  // A running exam takes the whole screen; the results page hands the site back.
  useLayoutMode(done ? null : 'focus');

  useEffect(() => {
    const sync = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPending(readSaved(title));
  }, [title]);

  useEffect(() => {
    if (done) return;
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t);
          setDone(true);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done]);

  const q = prepared[i];
  const answered = answers.filter((a) => a !== null).length;
  const showFeedback = mode === 'study' && revealed[i];

  // Save whenever an answer changes, and let the clock ride along. Writing on
  // every tick would be wasteful; the clock is only ever a few seconds stale.
  useEffect(() => {
    if (done || !answered) return;
    const byId: Record<string, number> = {};
    prepared.forEach((item, idx) => {
      const pos = answers[idx];
      if (pos !== null && pos !== undefined) byId[item.id] = item.order[pos];
    });
    writeSaved(title, { answers: byId, timeLeft: left, savedAt: Date.now() });
    // `left` is deliberately excluded: it changes every second and the answer
    // map is what actually needs persisting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, prepared, done, answered, title]);

  // Warn before an in-progress attempt is thrown away.
  useEffect(() => {
    if (done || !answered) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [done, answered]);

  function resume() {
    if (!pending) return;
    const nextAnswers = prepared.map((item) => {
      const orig = pending.answers[item.id];
      if (orig === undefined) return null;
      const pos = item.order.indexOf(orig);
      return pos >= 0 ? pos : null;
    });
    setAnswers(nextAnswers);
    if (mode === 'study') setRevealed(nextAnswers.map((a) => a !== null));
    setLeft(pending.timeLeft);
    const firstUnanswered = nextAnswers.findIndex((a) => a === null);
    setI(firstUnanswered >= 0 ? firstUnanswered : 0);
    setPending(null);
    setStarted(true);
  }

  function startOver() {
    clearSaved(title);
    setPending(null);
    setStarted(true);
  }

  function choose(optIdx: number) {
    if (showFeedback) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = optIdx;
      return next;
    });
    if (mode === 'study') {
      setRevealed((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
    }
  }

  // Keyboard: A-D or 1-4 to answer, arrows to move.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      const byNum = ['1', '2', '3', '4'].indexOf(e.key);
      const byChar = LETTERS.indexOf(e.key.toUpperCase());
      const pick = byNum >= 0 ? byNum : byChar;
      if (pick >= 0) { choose(pick); return; }
      if (e.key === 'ArrowRight') setI((v) => Math.min(v + 1, prepared.length - 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(v - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (done) {
    clearSaved(title);
    // Unkeyed questions are excluded from the denominator as well as the
    // numerator - scoring someone out of marks nobody can earn is just wrong.
    const keyed = prepared.filter((item) => item.answer >= 0);
    const scored = prepared.reduce(
      (acc, item, idx) => (item.answer >= 0 && answers[idx] === item.answer ? acc + item.marks : acc),
      0
    );
    const possible = keyed.reduce((acc, item) => acc + item.marks, 0);
    const right = prepared.filter((item, idx) => item.answer >= 0 && answers[idx] === item.answer).length;
    const pct = possible ? Math.round((scored / possible) * 100) : 0;
    const unkeyed = prepared.length - keyed.length;

    return (
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Result</h2>
          <div className="grid">
            <div className="stat"><b>{pct}%</b><span>Score</span></div>
            <div className="stat"><b>{scored}/{possible}</b><span>Marks</span></div>
            <div className="stat"><b>{right}/{keyed.length}</b><span>Correct</span></div>
            <div className="stat"><b>{clock(durationMinutes * 60 - left)}</b><span>Time taken</span></div>
          </div>
          {unkeyed > 0 && (
            <p className="muted" style={{ marginTop: '.6rem' }}>
              {unkeyed} {unkeyed === 1 ? 'question is' : 'questions are'} not scored: the
              source paper carried no answer key and {unkeyed === 1 ? 'it turns' : 'they turn'}{' '}
              on published policy figures we will not guess at.
            </p>
          )}
          <div className="navrow">
            <button className="btn" onClick={() => location.reload()}>Retake</button>
            {showUpsell && (
              <Link className="btn green" href="/unlock">Unlock 1,000 more questions</Link>
            )}
          </div>
        </div>

        {showUpsell && <UpsellModal answeredCount={answered} triggerAfter={1} />}

        {showUpsell && (
          <aside className="card upsell" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>
              {pct >= 70
                ? 'Solid score. Widen the ground you cover.'
                : `${possible - scored} marks were left on the table.`}
            </h2>
            <p className="muted">
              This paper is 50 questions. The full bank is 2,446, and every answer is
              explained rather than just marked. A bank of 1,000 is 5,000 RWF, paid once
              to MoMo Pay 232255.
            </p>
            <Link className="btn" href="/unlock">Get an access code</Link>
          </aside>
        )}

        <h2>Review</h2>
        {prepared.map((item, idx) => {
          const given = answers[idx];
          return (
            <div className="card qcard" key={item.id}>
              <div className="qtop">
                <span className="qnum">Question {idx + 1}</span>
                <span className="marks">{item.marks} {item.marks === 1 ? 'mark' : 'marks'}</span>
              </div>
              <div className="stem">{item.en.stem}</div>
              <div className="answers">
                {item.order.map((orig, pos) => (
                  <div
                    key={pos}
                    className={
                      'opt ' +
                      (item.answer < 0
                        ? given === pos
                          ? 'chosen'
                          : ''
                        : pos === item.answer
                          ? 'correct'
                          : given === pos
                            ? 'wrong'
                            : '')
                    }
                  >
                    <span className="letter">{LETTERS[pos]}</span>
                    <span className="dot"><i /></span>
                    <span className="txt">{item.en.options[orig]}</span>
                  </div>
                ))}
              </div>
              <div className="explain">
                <b>{item.answer >= 0 ? 'Why' : 'No published answer'}</b>
                {item.en.explanation}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {pending && !started && (
        <div className="resume-bar" role="status">
          <div>
            <strong>You have an attempt in progress</strong>
            <span className="muted">
              {' '}
              &mdash; {Object.keys(pending.answers).length} answered,{' '}
              {agoLabel(Date.now() - pending.savedAt)}
            </span>
          </div>
          <div className="resume-actions">
            <button className="btn" onClick={resume}>Resume</button>
            <button className="btn ghost" onClick={startOver}>Start over</button>
          </div>
        </div>
      )}

      <div className="exam-head">
        <span className="exam-title">{title}</span>
        <div className={'timeblock' + (left < 300 ? ' low' : '')}>
          <span>Remaining time</span>
          <strong>{clock(left)}</strong>
        </div>
        <div className="spacer" />
        <div role="group" aria-label="Language" style={{ display: 'flex', gap: '.3rem' }}>
          {(['both', 'en', 'fr'] as Lang[]).map((l) => (
            <button
              key={l}
              className={'btn ' + (lang === l ? '' : 'ghost')}
              style={{ padding: '.35rem .7rem', fontSize: '.85rem' }}
              onClick={() => setLang(l)}
            >
              {l === 'both' ? 'EN/FR' : l.toUpperCase()}
            </button>
          ))}
        </div>
        <a className="exam-exit" href="/" title="Leave the exam">
          Exit
        </a>
        <button
          className="btn ghost exam-full"
          onClick={async () => setIsFull(await toggleFullscreen())}
          title={isFull ? 'Leave fullscreen' : 'Fullscreen'}
          aria-label={isFull ? 'Leave fullscreen' : 'Enter fullscreen'}
        >
          {isFull ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
        <button
          className="btn green"
          onClick={() => {
            const left = prepared.length - answered;
            const msg =
              left > 0
                ? `Finish now? ${left} question${left === 1 ? '' : 's'} still unanswered.`
                : 'Finish and see your result?';
            if (confirm(msg)) setDone(true);
          }}
        >
          FINISH EXAM
        </button>
      </div>

      <div className="progress" role="progressbar" aria-valuenow={answered} aria-valuemin={0} aria-valuemax={prepared.length}>
        <i style={{ width: `${(answered / prepared.length) * 100}%` }} />
      </div>

      <div className="card qcard">
        <div className="qtop">
          <span className="qnum">Question {i + 1} <span className="muted">of {prepared.length}</span></span>
          <span className="marks">{q.marks} {q.marks === 1 ? 'mark' : 'marks'}</span>
        </div>

        <div className="stem">
          {lang !== 'fr' && <span>{q.en.stem}</span>}
          {q.fr && lang !== 'en' && <span className="fr">{q.fr.stem}</span>}
        </div>

        <div className="answers">
          <div className="lbl">Answers</div>
          {q.order.map((orig, pos) => {
            const chosen = answers[i] === pos;
            let cls = 'opt';
            if (showFeedback && q.answer >= 0 && pos === q.answer) cls += ' correct';
            else if (showFeedback && q.answer >= 0 && chosen) cls += ' wrong';
            else if (chosen) cls += ' chosen';
            return (
              <button key={pos} className={cls} onClick={() => choose(pos)} aria-pressed={chosen}>
                <span className="letter">{LETTERS[pos]}</span>
                <span className="dot"><i /></span>
                <span className="txt">
                  {lang !== 'fr' && <span>{q.en.options[orig]}</span>}
                  {q.fr && lang !== 'en' && <span className="fr">{q.fr.options[orig]}</span>}
                </span>
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="explain" ref={liveRef} aria-live="polite">
            <b>
              {q.answer < 0
                ? 'No published answer for this question'
                : answers[i] === q.answer
                  ? 'Correct'
                  : `Correct answer: ${LETTERS[q.answer]}`}
            </b>
            {lang !== 'fr' && <div>{q.en.explanation}</div>}
            {q.fr && lang !== 'en' && <div className="muted">{q.fr.explanation}</div>}
          </div>
        )}

        <div className="navrow">
          <button className="btn ghost" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            Previous
          </button>
          <div className="spacer" />
          <button
            className="btn"
            onClick={() => (i === prepared.length - 1 ? setDone(true) : setI((v) => v + 1))}
          >
            {i === prepared.length - 1 ? 'FINISH' : 'NEXT'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="lbl muted">All questions {answered}/{prepared.length}</div>
        <div className="qnav">
          {prepared.map((item, idx) => (
            <button
              key={item.id}
              className={
                (answers[idx] !== null ? 'answered ' : '') + (idx === i ? 'here' : '')
              }
              onClick={() => setI(idx)}
              aria-label={`Question ${idx + 1}${answers[idx] !== null ? ', answered' : ''}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
