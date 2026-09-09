'use client';

import { useEffect, useMemo, useState } from 'react';

const LETTERS = ['A', 'B', 'C', 'D'];
const PAGE = 40;

type Q = {
  id: string;
  slug: string;
  bankId: number;
  topic: string;
  marks: number;
  difficulty: string;
  examSource: string;
  answerIndex: number | null;
  answerSource?: string;
  en: { stem: string; options: string[]; explanation: string };
};

type Bank = { bankId: number; count: number };

export default function QuestionBrowser() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<Q[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bank, setBank] = useState<string>('1');
  const [q, setQ] = useState('');
  const [source, setSource] = useState('All');
  const [shown, setShown] = useState(PAGE);

  async function load(which: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/questions?bank=${encodeURIComponent(which)}`);
      if (res.status === 401) {
        setError('Not signed in as admin. Sign in on the admin page first.');
        setQuestions([]);
        return;
      }
      const data = await res.json();
      setQuestions(data.questions ?? []);
      if (data.banks) setBanks(data.banks);
    } catch {
      setError('Could not load questions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(bank);
    setShown(PAGE);
  }, [bank]);

  const sources = useMemo(
    () => ['All', ...[...new Set(questions.map((x) => x.examSource))].sort()],
    [questions]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return questions.filter((x) => {
      if (source !== 'All' && x.examSource !== source) return false;
      if (!needle) return true;
      return (
        x.en.stem.toLowerCase().includes(needle) ||
        x.en.options.some((o) => o.toLowerCase().includes(needle)) ||
        x.id.toLowerCase().includes(needle)
      );
    });
  }, [questions, q, source]);

  return (
    <>
      <div className="card" style={{ marginBottom: '1.2rem' }}>
        <div className="grid" style={{ gap: '.8rem' }}>
          <div>
            <label htmlFor="bank" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              Bank
            </label>
            <select
              id="bank"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="input-like"
            >
              {banks.map((b) => (
                <option key={b.bankId} value={String(b.bankId)}>
                  Bank {b.bankId} ({b.count})
                </option>
              ))}
              <option value="all">All banks</option>
            </select>
          </div>

          <div>
            <label htmlFor="src" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              Source
            </label>
            <select
              id="src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="input-like"
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="find" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              Search
            </label>
            <input
              id="find"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="stem, option text or id"
            />
          </div>
        </div>

        <p className="muted" style={{ margin: '.8rem 0 0' }}>
          {loading
            ? 'Loading…'
            : `${filtered.length.toLocaleString()} of ${questions.length.toLocaleString()} shown`}
        </p>
        {error && (
          <div className="notice bad" style={{ marginTop: '.7rem' }}>
            {error}
          </div>
        )}
      </div>

      {filtered.slice(0, shown).map((item) => (
        <div className="card qcard" key={item.id}>
          <div className="qtop">
            <span className="qnum">{item.id}</span>
            <span className="marks">
              {item.marks} {item.marks === 1 ? 'mark' : 'marks'}
            </span>
          </div>
          <div className="stem">{item.en.stem}</div>
          <div className="answers">
            {item.en.options.map((o, i) => (
              <div key={i} className={'opt ' + (i === item.answerIndex ? 'correct' : '')}>
                <span className="letter">{LETTERS[i]}</span>
                <span className="dot">
                  <i />
                </span>
                <span className="txt">{o}</span>
              </div>
            ))}
          </div>
          <div className="explain">
            <b>
              {item.answerIndex === null
                ? 'No published answer'
                : `Answer: ${LETTERS[item.answerIndex]}`}
            </b>
            <div>{item.en.explanation}</div>
          </div>
          <p className="muted" style={{ marginBottom: 0, fontSize: '.85rem' }}>
            bank {item.bankId} &middot; {item.topic} &middot; {item.examSource} &middot;{' '}
            {item.difficulty}
            {item.answerSource ? ` · key: ${item.answerSource}` : ''} &middot;{' '}
            <a href={`/questions/${item.slug}`} target="_blank" rel="noreferrer">
              public page
            </a>
          </p>
        </div>
      ))}

      {shown < filtered.length && (
        <div className="navrow">
          <button className="btn" onClick={() => setShown((v) => v + PAGE)}>
            Show {Math.min(PAGE, filtered.length - shown)} more
          </button>
        </div>
      )}
    </>
  );
}
