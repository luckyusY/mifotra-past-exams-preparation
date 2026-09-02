'use client';

import { useState } from 'react';

type Row = {
  hint: string;
  bankId: number;
  note: string;
  createdAt: string;
  redeemedAt: string | null;
  revoked: boolean;
};

export default function AdminPanel() {
  const [pw, setPw] = useState('');
  const [count, setCount] = useState(1);
  const [bankId, setBankId] = useState(1);
  const [note, setNote] = useState('');
  const [fresh, setFresh] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  const headers = { 'x-admin-password': pw, 'content-type': 'application/json' };

  async function list() {
    setError('');
    const res = await fetch('/api/admin/codes', { headers });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    setRows(data.codes);
  }

  async function generate() {
    setError('');
    const res = await fetch('/api/admin/codes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ count, bankId, note }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Failed');
      return;
    }
    setFresh(data.codes);
    await list();
  }

  return (
    <>
      <div className="card" style={{ maxWidth: 520, marginBottom: '1.2rem' }}>
        <label htmlFor="pw" style={{ fontWeight: 600 }}>
          Admin password
        </label>
        <input
          id="pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          style={{ marginBottom: '.8rem' }}
        />

        <div style={{ display: 'flex', gap: '.6rem', marginBottom: '.8rem' }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="n" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              How many
            </label>
            <input
              id="n"
              type="text"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="b" style={{ fontWeight: 600, fontSize: '.9rem' }}>
              Bank
            </label>
            <input
              id="b"
              type="text"
              inputMode="numeric"
              value={bankId}
              onChange={(e) => setBankId(Number(e.target.value) || 1)}
            />
          </div>
        </div>

        <label htmlFor="note" style={{ fontWeight: 600, fontSize: '.9rem' }}>
          Note (MoMo reference, buyer)
        </label>
        <input id="note" type="text" value={note} onChange={(e) => setNote(e.target.value)} />

        {error && (
          <div className="notice bad" style={{ marginTop: '.7rem' }}>
            {error}
          </div>
        )}

        <div className="navrow">
          <button className="btn" onClick={generate} disabled={!pw}>
            Generate
          </button>
          <button className="btn ghost" onClick={list} disabled={!pw}>
            Refresh list
          </button>
        </div>
      </div>

      {fresh.length > 0 && (
        <div className="card" style={{ marginBottom: '1.2rem' }}>
          <div className="notice good" style={{ marginBottom: '.8rem' }}>
            Copy these now &mdash; they are stored hashed and cannot be shown again.
          </div>
          {fresh.map((c) => (
            <div key={c}>
              <code style={{ fontSize: '1.05rem' }}>{c}</code>
            </div>
          ))}
        </div>
      )}

      {rows && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Issued ({rows.length})</h2>
          <table>
            <thead>
              <tr>
                <th>Hash</th>
                <th>Bank</th>
                <th>Note</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.hint}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
