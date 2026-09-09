'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

/**
 * "Explain this to me" on a single question.
 *
 * Deliberately opt-in per question rather than generated up front: most people
 * do not need it on most questions, and every call costs money. It sends only
 * the question id, so the endpoint can refuse anything not in the corpus.
 */
export default function AskAI({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [upgrade, setUpgrade] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [ask, setAsk] = useState('');

  async function explain() {
    setBusy(true);
    setError('');
    setUpgrade(false);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ questionId, ask: ask.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not get an explanation.');
        setUpgrade(Boolean(data.upgrade));
        return;
      }
      setText(data.explanation);
      setLeft(data.remaining);
      setOpen(true);
    } catch {
      setError('Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="askai">
      {!open && (
        <>
          <div className="askai-row">
            <input
              type="text"
              value={ask}
              onChange={(e) => setAsk(e.target.value)}
              placeholder="Anything specific? (optional)"
              aria-label="What would you like explained?"
            />
            <button className="btn" onClick={explain} disabled={busy}>
              {busy ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              {busy ? 'Thinking…' : 'Explain this to me'}
            </button>
          </div>
          {error && (
            <div className="notice bad askai-error">
              <AlertCircle size={15} />
              <span>{error}</span>
              {upgrade && (
                <Link href="/unlock" className="btn" style={{ marginLeft: 'auto' }}>
                  Get more
                </Link>
              )}
            </div>
          )}
        </>
      )}

      {open && (
        <div className="askai-answer">
          <div className="askai-head">
            <Sparkles size={15} />
            <strong>AI teacher</strong>
            {left !== null && (
              <span className="muted askai-left">{left} left today</span>
            )}
          </div>
          {text.split('\n').filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          <button className="btn ghost" onClick={() => { setOpen(false); setText(''); setAsk(''); }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
