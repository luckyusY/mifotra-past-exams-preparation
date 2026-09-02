'use client';

import { useState } from 'react';

type PostRow = {
  slug: string;
  title: string;
  metaDescription: string;
  status: 'draft' | 'published';
  createdAt: string;
  publishedAt: string | null;
  topic: string;
  model?: string;
};

/** Topics worth ranking for, phrased the way candidates actually search. */
const SUGGESTIONS = [
  'How the MIFOTRA written exam is scored and what the marks mean',
  'MIFOTRA ICT officer exam: the topics that come up most',
  'How to prepare for a Rwanda public service ICT exam in two weeks',
  'DNS, DHCP and the difference candidates get wrong most often',
  'Common networking questions in Rwandan public service exams',
  'Cybersecurity basics tested in MIFOTRA ICT recruitment',
];

export default function BlogConsole() {
  const [pw, setPw] = useState('');
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const headers = { 'x-admin-password': pw, 'content-type': 'application/json' };

  async function list() {
    setError('');
    const res = await fetch('/api/admin/blog', { headers });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    setRows(data.posts);
    setConfigured(data.providerConfigured);
  }

  async function generate() {
    setBusy(true);
    setError('');
    setNote('');
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic, extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        return;
      }
      setNote(`Drafted "${data.post.title}" with ${data.post.sections.length} sections.`);
      setTopic('');
      await list();
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  async function act(slug: string, action: 'publish' | 'unpublish' | 'delete') {
    if (action === 'delete' && !confirm(`Delete "${slug}" permanently?`)) return;
    setError('');
    const res = await fetch('/api/admin/blog', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ slug, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    await list();
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 620, marginBottom: '1.2rem' }}>
        <label htmlFor="pw" style={{ fontWeight: 600 }}>
          Admin password
        </label>
        <input
          id="pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ marginBottom: '.4rem' }}
        />
        <button className="btn ghost" onClick={list} disabled={!pw}>
          Load posts
        </button>

        {configured === false && (
          <div className="notice bad" style={{ marginTop: '.8rem' }}>
            No model API key set. Add <code>OPENAI_API_KEY</code> (or{' '}
            <code>ANTHROPIC_API_KEY</code>) to your environment and redeploy.
          </div>
        )}
      </div>

      <div className="card" style={{ maxWidth: 620, marginBottom: '1.2rem' }}>
        <label htmlFor="topic" style={{ fontWeight: 600 }}>
          Topic
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What should this guide answer?"
        />

        <div style={{ margin: '.6rem 0 .8rem', display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              className="btn ghost"
              style={{ fontSize: '.8rem', padding: '.3rem .6rem' }}
              onClick={() => setTopic(s)}
            >
              {s.length > 42 ? s.slice(0, 40) + '...' : s}
            </button>
          ))}
        </div>

        <label htmlFor="extra" style={{ fontWeight: 600, fontSize: '.9rem' }}>
          Extra steer (optional)
        </label>
        <input
          id="extra"
          type="text"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="e.g. focus on candidates with no formal IT training"
        />

        {error && (
          <div className="notice bad" style={{ marginTop: '.7rem' }}>
            {error}
          </div>
        )}
        {note && (
          <div className="notice good" style={{ marginTop: '.7rem' }}>
            {note}
          </div>
        )}

        <div className="navrow">
          <button className="btn" onClick={generate} disabled={!pw || busy || topic.trim().length < 8}>
            {busy ? 'Drafting...' : 'Draft post'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: '.85rem', marginBottom: 0 }}>
          Read it before publishing. A model will state something plausible and wrong
          often enough that an unchecked exam guide is a liability.
        </p>
      </div>

      {rows && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Posts ({rows.length})</h2>
          {rows.length === 0 && <p className="muted">Nothing yet.</p>}
          {rows.map((r) => (
            <div
              key={r.slug}
              style={{ padding: '.7rem 0', borderBottom: '1px solid var(--line)' }}
            >
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ flex: '1 1 260px' }}>{r.title}</strong>
                <span className="pill">{r.status}</span>
              </div>
              <div className="muted" style={{ fontSize: '.86rem', margin: '.2rem 0 .5rem' }}>
                /blog/{r.slug}
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                {/* Drafts are not served publicly, so a link to one would 404. */}
                {r.status === 'published' && (
                  <a
                    className="btn ghost"
                    style={{ fontSize: '.83rem', padding: '.3rem .7rem' }}
                    href={`/blog/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                )}
                <button
                  className="btn"
                  style={{ fontSize: '.83rem', padding: '.3rem .7rem' }}
                  onClick={() => act(r.slug, r.status === 'published' ? 'unpublish' : 'publish')}
                >
                  {r.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
                <button
                  className="btn ghost"
                  style={{ fontSize: '.83rem', padding: '.3rem .7rem' }}
                  onClick={() => act(r.slug, 'delete')}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
