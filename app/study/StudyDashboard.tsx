'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Flame, Target, CheckCircle2, Play, RotateCcw, Trophy, Lock } from 'lucide-react';
import ExamRunner from '@/app/ExamRunner';
import type { Question } from '@/lib/questions';
import { useSession } from '@/app/SessionProvider';
import { quoteOfDay } from '@/lib/quotes';
import {
  read, record, setDailyGoal, answeredToday, streak, statsFor, weakIds, type Progress,
} from '@/lib/progress';

const SET_SIZE = 100;

type Bundle = { questions: Question[]; locked: boolean };

/** Fixed-size sets, so "set 3 of 10" means the same thing every time. */
function toSets(questions: Question[]) {
  const sets = [];
  for (let i = 0; i < questions.length; i += SET_SIZE) {
    sets.push({
      index: sets.length + 1,
      questions: questions.slice(i, i + SET_SIZE),
    });
  }
  return sets;
}

export default function StudyDashboard({ freeQuestions }: { freeQuestions: Question[] }) {
  const { role, ready } = useSession();
  const [bundle, setBundle] = useState<Bundle>({ questions: freeQuestions, locked: true });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [running, setRunning] = useState<{ questions: Question[]; title: string } | null>(null);
  const [goalDraft, setGoalDraft] = useState(20);

  useEffect(() => {
    const p = read();
    setProgress(p);
    setGoalDraft(p.dailyGoal);
  }, []);

  // Anyone with entitlement studies their whole bank; everyone else the free set.
  useEffect(() => {
    if (!ready || role === 'anon') return;
    fetch('/api/questions')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.questions?.length) setBundle({ questions: d.questions, locked: false });
      })
      .catch(() => {});
  }, [ready, role]);

  const sets = useMemo(() => toSets(bundle.questions), [bundle]);
  const quote = quoteOfDay();

  function finish(results: { id: string; correct: boolean }[]) {
    record(results);
    setProgress(read());
    setRunning(null);
  }

  if (running) {
    return (
      <>
        <div className="navrow" style={{ marginBottom: '1rem' }}>
          <button className="btn ghost" onClick={() => setRunning(null)}>
            <RotateCcw size={15} /> Back to study plan
          </button>
        </div>
        <ExamRunner
          questions={running.questions}
          title={running.title}
          durationMinutes={Math.max(10, Math.round(running.questions.length * 1.2))}
          mode="study"
          shuffleQuestions
          showUpsell={role === 'anon'}
          onFinish={finish}
        />
      </>
    );
  }

  if (!progress) return <p className="muted">Loading your progress…</p>;

  const doneToday = answeredToday(progress);
  const days = streak(progress);
  const overall = statsFor(progress, bundle.questions.map((q) => q.id));
  const weak = weakIds(progress).filter((id) => bundle.questions.some((q) => q.id === id));
  const goalPct = Math.min(100, Math.round((doneToday / progress.dailyGoal) * 100));

  return (
    <>
      <figure className="quote">
        <blockquote>{quote.text}</blockquote>
        <figcaption>— {quote.who}</figcaption>
      </figure>

      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        <div className="card stat">
          <Flame size={18} className="stat-icon" />
          <b>{days}</b>
          <span>day{days === 1 ? '' : 's'} in a row</span>
        </div>
        <div className="card stat">
          <Target size={18} className="stat-icon" />
          <b>{doneToday}/{progress.dailyGoal}</b>
          <span>today&rsquo;s goal</span>
          <div className="goalbar"><i style={{ width: `${goalPct}%` }} /></div>
        </div>
        <div className="card stat">
          <CheckCircle2 size={18} className="stat-icon" />
          <b>{overall.seen}</b>
          <span>of {overall.total.toLocaleString()} attempted</span>
        </div>
        <div className="card stat">
          <Trophy size={18} className="stat-icon" />
          <b>{overall.seen ? Math.round((overall.correct / overall.seen) * 100) : 0}%</b>
          <span>correct so far</span>
        </div>
      </div>

      {weak.length >= 5 && (
        <div className="card upsell" style={{ marginBottom: '1.5rem' }}>
          <strong>{weak.length} question{weak.length === 1 ? '' : 's'} you got wrong</strong>
          <p className="muted" style={{ margin: '.3rem 0 .8rem' }}>
            Revisiting mistakes is worth more than new questions. These are the ones to redo.
          </p>
          <button
            className="btn"
            onClick={() =>
              setRunning({
                questions: bundle.questions.filter((q) => weak.slice(0, 40).includes(q.id)),
                title: 'Questions I got wrong',
              })
            }
          >
            <Play size={15} /> Redo up to 40
          </button>
        </div>
      )}

      <div className="block-head">
        <h2 style={{ margin: 0 }}>
          Study sets &mdash; {sets.length} × {SET_SIZE} questions
        </h2>
        {bundle.locked && (
          <Link href="/unlock" className="muted">
            Unlock the full bank
          </Link>
        )}
      </div>

      <div className="setgrid">
        {sets.map((s) => {
          const st = statsFor(progress, s.questions.map((q) => q.id));
          const pct = Math.round((st.seen / st.total) * 100);
          const done = st.seen === st.total;
          return (
            <button
              key={s.index}
              className={'setcard' + (done ? ' is-done' : '')}
              onClick={() => setRunning({ questions: s.questions, title: `Set ${s.index}` })}
            >
              <span className="set-n">Set {s.index}</span>
              <span className="muted set-meta">
                {st.seen}/{st.total} done
                {st.seen > 0 && ` · ${Math.round((st.correct / st.seen) * 100)}%`}
              </span>
              <span className="setbar"><i style={{ width: `${pct}%` }} /></span>
            </button>
          );
        })}
      </div>

      {bundle.locked && (
        <p className="muted" style={{ marginTop: '1rem', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <Lock size={14} /> These are the free questions. An access code opens a full bank of
          1,000 more.
        </p>
      )}

      <div className="card" style={{ marginTop: '2rem', maxWidth: 420 }}>
        <label htmlFor="goal" style={{ fontWeight: 600 }}>
          Daily goal
        </label>
        <p className="muted" style={{ margin: '.2rem 0 .6rem', fontSize: '.9rem' }}>
          A number you can hit on a bad day beats one you hit twice and abandon.
        </p>
        <div className="askai-row">
          <input
            id="goal"
            type="text"
            inputMode="numeric"
            value={goalDraft}
            onChange={(e) => setGoalDraft(Number(e.target.value) || 0)}
          />
          <button
            className="btn"
            onClick={() => {
              setDailyGoal(goalDraft);
              setProgress(read());
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}
