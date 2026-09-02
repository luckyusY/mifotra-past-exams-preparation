'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '@/lib/questions';
import { shuffle } from '@/lib/questions';

const LETTERS = ['A', 'B', 'C', 'D'];

type Lang = 'both' | 'en' | 'fr';

/** One question with its options already shuffled, and answerIndex remapped to match. */
type Prepared = Question & { order: number[]; answer: number };

function prepare(questions: Question[], doShuffle: boolean): Prepared[] {
  const list = doShuffle ? shuffle(questions) : questions;
  return list.map((q) => {
    const idx = q.en.options.map((_, i) => i);
    const order = doShuffle ? shuffle(idx) : idx;
    return { ...q, order, answer: order.indexOf(q.answerIndex) };
  });
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
}: {
  questions: Question[];
  title: string;
  durationMinutes: number;
  mode?: 'study' | 'exam';
  shuffleQuestions?: boolean;
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
  const [lang, setLang] = useState<Lang>('both');
  const liveRef = useRef<HTMLDivElement>(null);

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
    const scored = prepared.reduce(
      (acc, item, idx) => (answers[idx] === item.answer ? acc + item.marks : acc),
      0
    );
    const possible = prepared.reduce((acc, item) => acc + item.marks, 0);
    const right = prepared.filter((item, idx) => answers[idx] === item.answer).length;
    const pct = Math.round((scored / possible) * 100);

    return (
      <div>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Result</h2>
          <div className="grid">
            <div className="stat"><b>{pct}%</b><span>Score</span></div>
            <div className="stat"><b>{scored}/{possible}</b><span>Marks</span></div>
            <div className="stat"><b>{right}/{prepared.length}</b><span>Correct</span></div>
            <div className="stat"><b>{clock(durationMinutes * 60 - left)}</b><span>Time taken</span></div>
          </div>
          <div className="navrow">
            <button className="btn" onClick={() => location.reload()}>Retake</button>
          </div>
        </div>

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
                      'opt ' + (pos === item.answer ? 'correct' : given === pos ? 'wrong' : '')
                    }
                  >
                    <span className="letter">{LETTERS[pos]}</span>
                    <span className="dot"><i /></span>
                    <span className="txt">{item.en.options[orig]}</span>
                  </div>
                ))}
              </div>
              <div className="explain">
                <b>Why</b>
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
        <button className="btn green" onClick={() => setDone(true)}>FINISH EXAM</button>
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
            if (showFeedback && pos === q.answer) cls += ' correct';
            else if (showFeedback && chosen) cls += ' wrong';
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
            <b>{answers[i] === q.answer ? 'Correct' : `Correct answer: ${LETTERS[q.answer]}`}</b>
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
