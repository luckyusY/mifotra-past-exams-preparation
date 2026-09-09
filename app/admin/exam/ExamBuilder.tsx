'use client';

import { useEffect, useMemo, useState } from 'react';
import { Play, Filter, RotateCcw } from 'lucide-react';
import ExamRunner from '@/app/ExamRunner';
import type { Question } from '@/lib/questions';

type Loaded = Question & { bankId: number };

/**
 * Sit an exam on any part of the paid bank.
 *
 * The public site can only ever practise the 250 free questions plus the two
 * past papers; the 2,246 that people actually pay for were unreachable without
 * redeeming a code. This is the owner sitting their own product, which is also
 * the fastest way to find a bad question - reading a list is not the same as
 * being asked.
 */
export default function ExamBuilder() {
  const [all, setAll] = useState<Loaded[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [source, setSource] = useState('All');
  const [topic, setTopic] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [mode, setMode] = useState<'study' | 'exam'>('study');

  const [running, setRunning] = useState<{ questions: Question[]; title: string } | null>(null);

  useEffect(() => {
    fetch('/api/questions?bank=all')
      .then(async (res) => {
        if (res.status === 401) {
          setError('Not signed in as admin. Sign in on the admin page first.');
          return;
        }
        const d = await res.json();
        setAll(d.questions ?? []);
      })
      .catch(() => setError('Could not load the question bank.'))
      .finally(() => setLoading(false));
  }, []);

  const sources = useMemo(
    () => ['All', ...[...new Set(all.map((q) => q.examSource))].sort()],
    [all]
  );
  const topics = useMemo(() => {
    const inSource = source === 'All' ? all : all.filter((q) => q.examSource === source);
    return ['All', ...[...new Set(inSource.map((q) => q.topic))].sort()];
  }, [all, source]);

  const pool = useMemo(
    () =>
      all.filter(
        (q) =>
          (source === 'All' || q.examSource === source) &&
          (topic === 'All' || q.topic === topic) &&
          (difficulty === 'All' || q.difficulty === difficulty)
      ),
    [all, source, topic, difficulty]
  );

  // Reset a topic that the newly chosen source does not contain.
  useEffect(() => {
    if (topic !== 'All' && !topics.includes(topic)) setTopic('All');
  }, [topics, topic]);

  function start() {
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
    const label = [source === 'All' ? 'All sources' : source, topic === 'All' ? null : topic]
      .filter(Boolean)
      .join(' · ');
    // A distinct title keeps this attempt's saved progress away from a real one.
    setRunning({ questions: picked, title: `Admin practice — ${label}` });
  }

  if (running) {
    return (
      <>
        <div className="navrow" style={{ marginBottom: '1rem' }}>
          <button className="btn ghost" onClick={() => setRunning(null)}>
            <RotateCcw size={15} /> Build another
          </button>
        </div>
        <ExamRunner
          questions={running.questions}
          title={running.title}
          durationMinutes={minutes}
          mode={mode}
          shuffleQuestions
        />
      </>
    );
  }

  return (
    <div className="card">
      {error && <div className="notice bad">{error}</div>}
      {loading && <p className="muted">Loading the bank…</p>}

      {!loading && !error && (
        <>
          <div className="grid" style={{ gap: '.8rem' }}>
            <div>
              <label htmlFor="src" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Subject
              </label>
              <select
                id="src"
                className="input-like"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {sources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="top" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Topic
              </label>
              <select
                id="top"
                className="input-like"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                {topics.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dif" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Difficulty
              </label>
              <select
                id="dif"
                className="input-like"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {['All', 'Easy', 'Medium', 'Hard'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid" style={{ gap: '.8rem', marginTop: '.8rem' }}>
            <div>
              <label htmlFor="n" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Questions
              </label>
              <input
                id="n"
                type="text"
                inputMode="numeric"
                value={count}
                onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <label htmlFor="m" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Minutes
              </label>
              <input
                id="m"
                type="text"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <label htmlFor="md" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Mode
              </label>
              <select
                id="md"
                className="input-like"
                value={mode}
                onChange={(e) => setMode(e.target.value as 'study' | 'exam')}
              >
                <option value="study">Study — answers as you go</option>
                <option value="exam">Exam — scored at the end</option>
              </select>
            </div>
          </div>

          <p className="muted" style={{ marginTop: '.9rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <Filter size={14} />
            {pool.length.toLocaleString()} questions match. Sitting{' '}
            {Math.min(count, pool.length)}.
          </p>

          <div className="navrow">
            <button className="btn" onClick={start} disabled={pool.length === 0}>
              <Play size={15} /> Start exam
            </button>
          </div>
        </>
      )}
    </div>
  );
}
