'use client';

import { useEffect, useState } from 'react';
import { Trash2, Sparkles, TrendingUp } from 'lucide-react';

type Item = {
  key: string;
  questionId: string;
  ask: string | null;
  text: string;
  model: string;
  createdAt: string;
  hits: number;
};

export default function ExplanationList() {
  const [items, setItems] = useState<Item[]>([]);
  const [stats, setStats] = useState<{ total: number; explained: number; saved: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/explanations');
      if (res.status === 401) {
        setError('Not signed in as admin. Sign in on the admin page first.');
        return;
      }
      const d = await res.json();
      setItems(d.items ?? []);
      setStats({ total: d.total, explained: d.explained, saved: d.saved });
    } catch {
      setError('Could not load explanations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(key: string) {
    if (!confirm('Delete this explanation? The next request will regenerate it.')) return;
    await fetch('/api/admin/explanations', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    load();
  }

  if (error) return <div className="notice bad">{error}</div>;
  if (loading) return <p className="muted">Loading…</p>;

  const pct = stats && stats.total ? ((stats.explained / stats.total) * 100).toFixed(2) : '0';

  return (
    <>
      {stats && (
        <div className="grid" style={{ marginBottom: '1.5rem' }}>
          <div className="card stat">
            <Sparkles size={18} className="stat-icon" />
            <b>{stats.explained.toLocaleString()}</b>
            <span>questions explained</span>
            <div className="goalbar">
              <i style={{ width: `${Math.max(0.5, Number(pct))}%` }} />
            </div>
          </div>
          <div className="card stat">
            <b>{pct}%</b>
            <span>of {stats.total.toLocaleString()} in the bank</span>
          </div>
          <div className="card stat">
            <TrendingUp size={18} className="stat-icon" />
            <b>{stats.saved.toLocaleString()}</b>
            <span>model calls avoided by the cache</span>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="notice">
          Nothing stored yet. Explanations appear here as learners ask for them.
        </div>
      ) : (
        items.map((it) => (
          <div className="card qcard" key={it.key}>
            <div className="qtop">
              <span className="qnum">{it.questionId}</span>
              <span className="marks">{it.hits} served</span>
            </div>
            {it.ask && (
              <p className="muted" style={{ marginTop: 0 }}>
                Asked: “{it.ask}”
              </p>
            )}
            {it.text.split('\n').filter(Boolean).map((p, i) => (
              <p key={i} style={{ marginBottom: '.6rem' }}>
                {p}
              </p>
            ))}
            <div className="navrow">
              <a className="btn ghost" href={`/admin/questions?q=${it.questionId}`}>
                See the question
              </a>
              <button
                className="btn ghost"
                onClick={() => remove(it.key)}
                style={{ color: 'var(--red)' }}
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
