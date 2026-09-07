'use client';

import { useEffect, useState } from 'react';
import { whatsappLink } from '../Contact';

type Row = {
  codeHash: string;
  hint: string;
  bankId: number;
  note: string;
  createdAt: string;
  redeemedAt: string | null;
  revoked: boolean;
};

/**
 * Clipboard with a fallback. navigator.clipboard needs a secure context and is
 * missing from some older Android WebViews, which is a real slice of this
 * audience - and a Copy button that silently does nothing is worse than none.
 */
async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

const codeMessage = (code: string) =>
  `Here is your access code for the MIFOTRA question bank: ${code}\n\n` +
  `Enter it at the Unlock page. It works once, on one device.`;

export default function AdminPanel() {
  const [count, setCount] = useState('1');
  const [bankId, setBankId] = useState('1');
  const [note, setNote] = useState('');
  const [fresh, setFresh] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'' | 'generate' | 'list'>('');
  const [copied, setCopied] = useState('');
  const [filter, setFilter] = useState('');

  const json = { 'content-type': 'application/json' };

  useEffect(() => {
    list();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function list() {
    setBusy('list');
    setError('');
    try {
      const res = await fetch('/api/admin/codes');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        return;
      }
      setRows(data.codes);
    } catch {
      setError('Network error.');
    } finally {
      setBusy('');
    }
  }

  async function generate() {
    setBusy('generate');
    setError('');
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ count: Number(count) || 1, bankId: Number(bankId) || 1, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed');
        return;
      }
      setFresh(data.codes);
      setNote('');
      await list();
    } catch {
      setError('Network error.');
    } finally {
      setBusy('');
    }
  }

  async function setRevoked(codeHash: string, revoke: boolean) {
    setError('');
    const res = await fetch('/api/admin/codes', {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ codeHash, action: revoke ? 'revoke' : 'unrevoke' }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? 'Failed');
      return;
    }
    await list();
  }

  async function flash(text: string, label: string) {
    if (await copy(text)) {
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } else {
      setError('Could not copy. Select the code and copy it manually.');
    }
  }

  const shown = rows?.filter(
    (r) =>
      !filter.trim() ||
      r.note.toLowerCase().includes(filter.toLowerCase()) ||
      r.hint.includes(filter.toLowerCase())
  );
  const redeemed = rows?.filter((r) => r.redeemedAt).length ?? 0;
  const revoked = rows?.filter((r) => r.revoked).length ?? 0;
  const unused = (rows?.length ?? 0) - redeemed - revoked;

  return (
    <>
      <div className="card" style={{ maxWidth: 560, marginBottom: '1.2rem' }}>
        <h2 style={{ marginTop: 0 }}>Issue a code</h2>

        <div style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 110px' }}>
            <label htmlFor="n" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              How many
            </label>
            <input
              id="n"
              type="text"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
          <div style={{ flex: '1 1 110px' }}>
            <label htmlFor="b" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              Bank
            </label>
            <input
              id="b"
              type="text"
              inputMode="numeric"
              value={bankId}
              onChange={(e) => setBankId(e.target.value.replace(/[^0-9]/g, ''))}
            />
          </div>
        </div>

        <label htmlFor="note" style={{ fontWeight: 600, fontSize: '.9rem' }}>
          Note &mdash; MoMo reference and buyer number
        </label>
        <input
          id="note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="MoMo 12345678 / 0788..."
        />

        {error && (
          <div className="notice bad" role="alert" style={{ marginTop: '.7rem' }}>
            {error}
          </div>
        )}

        <div className="navrow">
          <button className="btn" onClick={generate} disabled={busy !== ''}>
            {busy === 'generate' ? 'Generating...' : `Generate ${count || 1}`}
          </button>
          <button className="btn ghost" onClick={list} disabled={busy !== ''}>
            {busy === 'list' ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {fresh.length > 0 && (
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <div className="notice good" style={{ marginBottom: '.8rem' }}>
            Copy these now &mdash; they are stored hashed and cannot be shown again.
          </div>

          {fresh.map((c) => (
            <div className="code-row" key={c}>
              <code>{c}</code>
              <button
                className="btn ghost mini"
                onClick={() => flash(c, c)}
                aria-label={`Copy code ${c}`}
              >
                {copied === c ? 'Copied' : 'Copy'}
              </button>
              <a
                className="btn mini"
                href={whatsappLink(codeMessage(c))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send
              </a>
            </div>
          ))}

          {fresh.length > 1 && (
            <div className="navrow">
              <button className="btn ghost" onClick={() => flash(fresh.join('\n'), 'all')}>
                {copied === 'all' ? 'Copied all' : `Copy all ${fresh.length}`}
              </button>
            </div>
          )}
        </div>
      )}

      {rows && (
        <div className="card">
          <div className="section-head">
            <h2 style={{ margin: 0 }}>Issued</h2>
            <span className="muted">
              {rows.length} total &middot; {unused} unused &middot; {redeemed} redeemed
              {revoked > 0 && ` · ${revoked} revoked`}
            </span>
          </div>

          <label className="sr-only" htmlFor="filter">
            Filter by note
          </label>
          <input
            id="filter"
            type="search"
            placeholder="Filter by note or hash"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ margin: '.6rem 0' }}
          />

          {shown && shown.length === 0 ? (
            <p className="muted">Nothing matches that filter.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Hash</th>
                    <th>Bank</th>
                    <th>Note</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown?.map((r) => (
                    <tr key={r.codeHash}>
                      <td>
                        <code>{r.hint}</code>
                      </td>
                      <td>{r.bankId}</td>
                      <td>{r.note}</td>
                      <td>
                        {r.revoked
                          ? 'Revoked'
                          : r.redeemedAt
                            ? `Used ${new Date(r.redeemedAt).toLocaleDateString()}`
                            : 'Unused'}
                      </td>
                      <td>
                        <button
                          className="btn ghost mini"
                          onClick={() => setRevoked(r.codeHash, !r.revoked)}
                        >
                          {r.revoked ? 'Restore' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
