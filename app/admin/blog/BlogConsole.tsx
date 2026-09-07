'use client';

import { useEffect, useRef, useState } from 'react';

type PostBody = {
  slug: string;
  title: string;
  status: string;
  metaDescription: string;
  intro: string;
  sections: { heading: string; paragraphs: string[]; bullets?: string[] }[];
  faq: { question: string; answer: string }[];
};

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
  const [topic, setTopic] = useState('');
  const [extra, setExtra] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<PostRow[] | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [matrix, setMatrix] = useState<{ total: number; written: number } | null>(null);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPattern, setBulkPattern] = useState('');
  const [patterns, setPatterns] = useState<string[]>([]);
  const [preview, setPreview] = useState<PostBody | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const stopRef = useRef(false);

  const headers = { 'content-type': 'application/json' };

  useEffect(() => {
    list();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Fetch one post WITH its body so a draft can be read before publishing. */
  async function openPreview(slug: string) {
    setError('');
    const res = await fetch(`/api/admin/blog?slug=${encodeURIComponent(slug)}`, { headers });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not load that post.');
      return;
    }
    setPreview(data.post);
  }

  /**
   * Bulk runs one post at a time from the client rather than in a single long
   * request: it shows progress, survives a serverless timeout that a fifteen
   * minute request would not, and can be stopped part-way.
   */
  async function runBulk() {
    setBusy(true);
    setError('');
    setNote('');
    stopRef.current = false;
    const total = bulkCount;
    let made = 0;

    for (let n = 0; n < total; n++) {
      if (stopRef.current) break;
      setProgress({ done: n, total });
      try {
        const res = await fetch('/api/admin/blog/bulk', {
          method: 'POST',
          headers,
          body: JSON.stringify({ count: 1, pattern: bulkPattern || null }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? 'Failed');
          break;
        }
        if (!data.created.length) {
          setNote(data.note ?? 'Nothing left to write for that pattern.');
          break;
        }
        made += data.created.length;
        if (data.failed?.length) setError(`${data.failed[0].title}: ${data.failed[0].error}`);
      } catch {
        setError('Network error.');
        break;
      }
    }

    setProgress(null);
    setBusy(false);
    if (made) setNote(`Drafted ${made} post${made === 1 ? '' : 's'}. Read them before publishing.`);
    await list();
  }

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

    const m = await fetch('/api/admin/blog/bulk', { headers });
    if (m.ok) {
      const md = await m.json();
      setMatrix({ total: md.total, written: md.written });
      setPatterns([...new Set(md.matrix.map((t: { pattern: string }) => t.pattern))] as string[]);
    }
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
      {configured === false && (
        <div className="notice bad" style={{ marginBottom: '1.2rem' }}>
          No model API key set. Add <code>OPENAI_API_KEY</code> (or{' '}
          <code>ANTHROPIC_API_KEY</code>) to your environment and redeploy.
        </div>
      )}

      {matrix && (
        <div className="card" style={{ maxWidth: 620, marginBottom: '1.2rem' }}>
          <h2 style={{ marginTop: 0 }}>Bulk generate</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            {matrix.written} of {matrix.total} matrix topics written.{' '}
            {matrix.total - matrix.written} remaining. Each post links back into the
            question corpus and to sibling guides.
          </p>

          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.8rem' }}>
            <div style={{ flex: '1 1 120px' }}>
              <label htmlFor="bc" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                How many
              </label>
              <input
                id="bc"
                type="text"
                inputMode="numeric"
                value={bulkCount}
                onChange={(e) => setBulkCount(Number(e.target.value) || 1)}
              />
            </div>
            <div style={{ flex: '2 1 220px' }}>
              <label htmlFor="bp" style={{ fontWeight: 600, fontSize: '.9rem' }}>
                Pattern
              </label>
              <select
                id="bp"
                value={bulkPattern}
                onChange={(e) => setBulkPattern(e.target.value)}
                style={{
                  font: 'inherit', width: '100%', padding: '.6rem .75rem',
                  borderRadius: 8, border: '1px solid var(--line)',
                  background: 'var(--surface)', color: 'var(--ink)',
                }}
              >
                <option value="">All patterns</option>
                {patterns.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="navrow">
            <button className="btn" onClick={runBulk} disabled={busy}>
              {busy ? 'Drafting...' : `Draft ${bulkCount} posts`}
            </button>
            {busy && (
              <button className="btn ghost" onClick={() => (stopRef.current = true)}>
                Stop after this one
              </button>
            )}
          </div>

          {progress && (
            <div className="progress-line">
              <div className="progress">
                <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
              <span className="muted">
                {progress.done} of {progress.total} drafted &mdash; each takes 20 to 40 seconds
              </span>
            </div>
          )}
          <p className="muted" style={{ fontSize: '.85rem', marginBottom: 0 }}>
            Runs one at a time to stay inside provider rate limits. Expect roughly
            20&ndash;40 seconds per post.
          </p>
        </div>
      )}

      <div className="card" style={{ maxWidth: 620, marginBottom: '1.2rem' }}>
        <h2 style={{ marginTop: 0 }}>Single topic</h2>
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
          <button className="btn" onClick={generate} disabled={busy || topic.trim().length < 8}>
            {busy ? 'Drafting...' : 'Draft post'}
          </button>
        </div>
        <p className="muted" style={{ fontSize: '.85rem', marginBottom: 0 }}>
          Read it before publishing. A model will state something plausible and wrong
          often enough that an unchecked exam guide is a liability.
        </p>
      </div>

      {preview && (
        <div className="card preview-panel">
          <div className="section-head">
            <h2 style={{ margin: 0 }}>{preview.title}</h2>
            <button className="btn ghost mini" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
          <p className="muted" style={{ marginTop: '.3rem' }}>
            {preview.status} &middot; /blog/{preview.slug}
          </p>
          <p className="muted">
            <strong>Meta:</strong> {preview.metaDescription} ({preview.metaDescription.length} chars)
          </p>

          <p className="lead">{preview.intro}</p>

          {preview.sections.map((sec, i) => (
            <section key={i}>
              <h3>{sec.heading}</h3>
              {sec.paragraphs.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
              {sec.bullets && sec.bullets.length > 0 && (
                <ul>
                  {sec.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {preview.faq.length > 0 && (
            <section>
              <h3>Common questions</h3>
              {preview.faq.map((f, i) => (
                <div key={i} style={{ marginBottom: '.7rem' }}>
                  <strong>{f.question}</strong>
                  <p style={{ margin: 0 }}>{f.answer}</p>
                </div>
              ))}
            </section>
          )}

          <div className="navrow">
            <button
              className="btn"
              onClick={() => {
                act(preview.slug, preview.status === 'published' ? 'unpublish' : 'publish');
                setPreview(null);
              }}
            >
              {preview.status === 'published' ? 'Unpublish' : 'Publish this'}
            </button>
            <button className="btn ghost" onClick={() => setPreview(null)}>
              Close
            </button>
          </div>
        </div>
      )}

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
                <button
                  className="btn ghost"
                  style={{ fontSize: '.83rem', padding: '.3rem .7rem' }}
                  onClick={() => openPreview(r.slug)}
                >
                  Read
                </button>
                {r.status === 'published' && (
                  <a
                    className="btn ghost"
                    style={{ fontSize: '.83rem', padding: '.3rem .7rem' }}
                    href={`/blog/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
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
